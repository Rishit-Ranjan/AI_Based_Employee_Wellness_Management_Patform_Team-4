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

const spawnProcess = (command, args, cwd, childArgs) => {
  // Pass-through argv for child scripts (e.g. start-backend.cjs). Run them
  // with the current Node executable: `.cjs` is neither in PATHEXT nor a
  // registered file association on Windows, so handing the file straight to
  // cmd.exe silently does nothing. Going through `node` avoids the shell
  // entirely -- no quoting, no DEP0190 warning -- and works on every platform.
  if (cwd === null && command.endsWith('cjs')) {
    return spawn(process.execPath, [command, ...(childArgs || args || [])], {
      stdio: 'inherit',
      shell: false,
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

console.log('');
console.log('==============================================================');
console.log('Employee Wellness Analytics - local development');
console.log('Backend (Flask API) starts first, then the frontend (Vite).');
console.log('Press Ctrl+C once to stop both servers.');
console.log('==============================================================');
console.log('');
console.log('Starting backend (Waitress + Flask)...');

// Spawn backend using the project Python venv interpreter so NO manual
// `venv\Scripts\Activate.ps1` is required. Works identically after activation
// (the venv is then resolved via PATH precedence instead).
backendProcess = spawnProcess(
  path.join(__dirname, 'start-backend.cjs'),
  [],
  null,
  backendArgs,
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

const waitForBackend = async (timeoutMs = backendReadyTimeoutMs, intervalMs = backendReadyIntervalMs) => {
  const start = Date.now();
  const deadline = start + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await isBackendReady();
    if (ready) return true;
    if (backendExitedEarly) return false;

    const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
    const spinnerChars = ['|', '/', '-', '\\'];
    const spinnerChar = spinnerChars[elapsedSeconds % spinnerChars.length];
    if (process.stdout.isTTY) {
      process.stdout.write(`\rWaiting for the backend to be ready... (${elapsedSeconds}s) ${spinnerChar}`);
    } else {
      console.log(`Waiting for the backend to be ready... (${elapsedSeconds}s)`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
};

(async () => {
  const ready = await waitForBackend();
  // Clear the waiting line and move to a fresh line so backend logs appear below the spinner
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K\n');
  if (ready) {
    if (waitOnHandled) return;
    waitOnHandled = true;
    console.log('Backend is ready  ->  http://localhost:8000');
    startFrontend();
  } else {
    console.warn(`Backend was not ready after ${backendReadyTimeoutMs / 1000}s - starting the frontend anyway.`);
    startFrontend();
  }
})();