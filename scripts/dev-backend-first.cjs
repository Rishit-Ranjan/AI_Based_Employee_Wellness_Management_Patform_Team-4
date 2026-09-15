const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.resolve(projectRoot, 'backend', 'src');
const frontendDir = path.resolve(projectRoot, 'frontend');
const backendUrl = 'http://127.0.0.1:8000';
const backendReadyTimeoutMs = Number(process.env.BACKEND_READY_TIMEOUT_MS) || 20000; // 20 secs timeout
const backendReadyIntervalMs = Number(process.env.BACKEND_READY_INTERVAL_MS) || 1000;
let frontendProcess;
let backendProcess;
let frontendStarted = false;
let waitOnHandled = false;
let backendExitedEarly = false;

// Quote a single argv entry for cmd.exe when it contains characters the
// shell would otherwise interpret.
const shellQuote = (value) => {
  const s = String(value);
  return /[\s"^&|<>()]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Fold a command + argv into one safely quoted command line. Required for
// `npm.cmd`, which cannot be spawned without a shell on Windows (Node refuses
// .cmd/.bat for security) -- and Node emits the DEP0190 deprecation warning
// when an args array is combined with `shell: true`, so the whole line is
// passed as the command and no args array is supplied.
const buildShellCommand = (command, args) =>
  [command, ...(args || [])].map(shellQuote).join(' ');

// `extraOptions` is merged into the spawn options, which lets callers pipe a
// child's output instead of inheriting our stdio (see the backend spawn).
const spawnProcess = (command, args, cwd, childArgs, extraOptions = {}) => {
  // Pass-through argv for child scripts (e.g. start-backend.cjs). Run them
  // with the current Node executable: `.cjs` is neither in PATHEXT nor a
  // registered file association on Windows, so handing the file straight to
  // cmd.exe silently does nothing. Going through `node` avoids the shell
  // entirely -- no quoting, no DEP0190 warning -- and works on every platform.
  if (cwd === null && command.endsWith('cjs')) {
    return spawn(process.execPath, [command, ...(childArgs || args || [])], {
      stdio: 'inherit',
      shell: false,
      ...extraOptions,
    });
  }
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const useShell = process.platform === 'win32' && command === 'npm';
  const spawnArgs = useShell ? [] : (childArgs || args);
  const spawnCommand = useShell ? buildShellCommand(executable, childArgs || args) : executable;

  const proc = spawn(spawnCommand, spawnArgs, {
    cwd,
    stdio: 'inherit',
    shell: useShell,
    ...extraOptions,
  });

  proc.on('error', (err) => {
    console.error(`Failed to start "${command}": ${err.message}`);
  });

  return proc;
};

const cleanup = (exitCode = 0) => {
  if (frontendProcess && !frontendProcess.killed) {
    try { frontendProcess.kill(); } catch (e) {}
  }
  if (backendProcess && !backendProcess.killed) {
    try { backendProcess.kill(); } catch (e) {}
  }
  process.exit(exitCode);
};

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('uncaughtException', (err) => {
  console.error('Unexpected error:', err);
  cleanup(1);
});

const startFrontend = () => {
  if (frontendStarted) return;
  frontendStarted = true;
  console.log('Starting frontend (Vite dev server)...');
  frontendProcess = spawnProcess('npm', ['run', 'dev', '--', '--host'], frontendDir);

  frontendProcess.on('exit', (code) => {
    cleanup(code || 0);
  });
};

const backendArgs = [
  '--listen=0.0.0.0:8000',
  // Match backend/waitress.ini so the dev server uses the intended worker
  // threads and channel timeout (avoids Waitress's default of only 4 threads,
  // which caused request queue build-up under concurrent load).
  '--threads=8',
  '--channel-timeout=20',
  'run_flask:app',
];

console.log('Starting backend (Waitress + Flask)...');

// Spawn backend using the project Python venv interpreter so NO manual
// `venv\Scripts\Activate.ps1` is required. Works identically after activation
// (the venv is then resolved via PATH precedence instead).
//
// Its output is PIPED (not inherited) so it can be re-emitted by `forwardLines`
// without corrupting the countdown line -- see the status helpers further down.
// Piped stdout is block-buffered in Python, so PYTHONUNBUFFERED keeps the
// backend's own prints (e.g. startup diagnostics) visible immediately.
backendProcess = spawnProcess(
  path.join(__dirname, 'start-backend.cjs'),
  [],
  null,
  backendArgs,
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: process.env.PYTHONUNBUFFERED || '1' },
  },
);

backendProcess.on('exit', (code) => {
  if (!frontendStarted) {
    backendExitedEarly = true;
    console.warn(`Backend stopped before the frontend started (exit code ${code}). Starting the frontend anyway.`);
    startFrontend();
  } else {
    console.warn(`Backend stopped (exit code ${code}). The frontend keeps running at http://localhost:5173/.`);
  }
});

const isBackendReady = () => new Promise((resolve) => {
  const url = new URL(backendUrl);
  const req = http.request(
    { hostname: url.hostname, port: url.port, method: 'HEAD', timeout: 2000 },
    (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    }
  );

  req.on('error', () => resolve(false));
  req.on('timeout', () => {
    req.destroy();
    resolve(false);
  });
  req.end();
});

const statusMessage = 'Waiting for the backend to be ready...';
const spinnerChars = ['|', '/', '-', '\\'];
let statusDrawn = false; // true while an unfinished status line is on screen
let statusWidth = 0; // width of the widest status line drawn so far
let statusPrinted = false; // non-TTY: the single status line was already sent
let lastStatusText = ''; // most recent status text, reused when redrawing

const drawStatus = (liveText) => {
  lastStatusText = liveText;
  if (!process.stdout.isTTY) {
    // No cursor to move: emit the waiting message once, never once per second.
    if (statusPrinted) return;
    statusPrinted = true;
    process.stdout.write(`${statusMessage}\n`);
    return;
  }

  // Pad to the widest text drawn so far and erase the rest of the line, so a
  // shorter update (e.g. `(10s)` -> `(9s)`) never leaves leftover characters.
  const width = Math.max(statusWidth, liveText.length);
  process.stdout.write(`\r${liveText.padEnd(width, ' ')}\x1b[K`);
  statusWidth = width;
  statusDrawn = true;
};

// Erase the status line and park the cursor at the start of it, so the next
// message is not appended to the countdown text.
const clearStatus = () => {
  if (process.stdout.isTTY && statusDrawn) {
    process.stdout.write('\r\x1b[K');
  }
  statusDrawn = false;
  statusWidth = 0;
};

const emitChildLine = (target, line) => {
  const statusOnScreen = statusDrawn; // only ever true on a TTY
  clearStatus();
  target.write(`${line}\n`);
  if (statusOnScreen) drawStatus(lastStatusText);
};

// Pipes deliver arbitrary chunks, so whole lines are buffered before they are
// re-emitted (this also keeps a partial line from breaking the status line).
const forwardLines = (stream, target) => {
  if (!stream) return;
  let pending = '';
  stream.on('data', (chunk) => {
    pending += chunk.toString();
    let newlineIndex = pending.indexOf('\n');
    while (newlineIndex !== -1) {
      emitChildLine(target, pending.slice(0, newlineIndex).replace(/\r$/, ''));
      pending = pending.slice(newlineIndex + 1);
      newlineIndex = pending.indexOf('\n');
    }
  });
  stream.on('end', () => {
    if (pending) emitChildLine(target, pending.replace(/\r$/, ''));
    pending = '';
  });
};

const waitForBackend = async (timeoutMs = backendReadyTimeoutMs, intervalMs = backendReadyIntervalMs) => {
  const start = Date.now();
  const deadline = start + timeoutMs;
  while (Date.now() < deadline) {
    if (await isBackendReady()) {
      return { ready: true, waitedMs: Date.now() - start };
    }
    if (backendExitedEarly) {
      return { ready: false, waitedMs: Date.now() - start };
    }

    const waitedMs = Date.now() - start;
    const elapsedSeconds = Math.floor(waitedMs / 1000);
    const spinnerChar = spinnerChars[elapsedSeconds % spinnerChars.length];
    drawStatus(`${statusMessage} (${elapsedSeconds}s) ${spinnerChar}`);

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { ready: false, waitedMs: Date.now() - start };
};

(async () => {
  // Re-emit the backend's own log lines above the countdown line, so they can
  // never be appended to it (which used to push each retry onto a new line).
  forwardLines(backendProcess.stdout, process.stdout);
  forwardLines(backendProcess.stderr, process.stderr);

  const { ready, waitedMs } = await waitForBackend();
  // Erase the countdown line (if one is on screen) and reuse it for the result,
  // so the terminal keeps a single "Waiting..." line instead of one per second.
  clearStatus();
  if (ready) {
    if (waitOnHandled) return;
    waitOnHandled = true;
    console.log(`Backend is ready  ->  http://localhost:8000 (${Math.round(waitedMs / 1000)}s)`);
    startFrontend();
  } else {
    console.warn(`Backend was not ready after ${backendReadyTimeoutMs / 1000}s - starting the frontend anyway.`);
    startFrontend();
  }
})();