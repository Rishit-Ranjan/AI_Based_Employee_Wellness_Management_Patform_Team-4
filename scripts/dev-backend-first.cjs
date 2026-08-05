const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.resolve(projectRoot, 'backend', 'src');
const frontendDir = path.resolve(projectRoot, 'frontend');
const backendUrl = 'http://127.0.0.1:8000';
const backendReadyTimeoutMs = Number(process.env.BACKEND_READY_TIMEOUT_MS) || 15000; // 15 secs timeout
const backendReadyIntervalMs = Number(process.env.BACKEND_READY_INTERVAL_MS) || 1000;
let frontendProcess;
let backendProcess;
let frontendStarted = false;
let waitOnHandled = false;
let backendExitedEarly = false;

const spawnProcess = (command, args, cwd) => {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const useShell = process.platform === 'win32' && command === 'npm';
  const spawnArgs = useShell ? undefined : args;
  const spawnCommand = useShell ? `${executable} ${args.join(' ')}` : executable;

  const proc = spawn(spawnCommand, spawnArgs, {
    cwd,
    stdio: 'inherit',
    shell: useShell,
  });

  proc.on('error', (err) => {
    console.error(`Failed to start ${command}:`, err);
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
  console.error('Uncaught exception:', err);
  cleanup(1);
});

const startFrontend = () => {
  if (frontendStarted) return;
  frontendStarted = true;
  console.log('Starting frontend...');
  console.log('Started frontend');
  frontendProcess = spawnProcess('npm', ['run', 'dev', '--', '--host'], frontendDir);

  frontendProcess.on('exit', (code) => {
    cleanup(code || 0);
  });
};

backendProcess = spawnProcess('waitress-serve', ['--listen=0.0.0.0:8000', 'run_flask:app'], backendDir);

backendProcess.on('exit', (code) => {
  if (!frontendStarted) {
    backendExitedEarly = true;
    console.warn(`Backend exited before frontend started with code ${code}. Launching frontend anyway.`);
    startFrontend();
  } else {
    console.warn(`Backend exited with code ${code}. Frontend will remain available at http://localhost:5173/`);
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
      process.stdout.write(`\rWaiting for backend to become ready... (${elapsedSeconds}s) ${spinnerChar}`);
    } else {
      console.log(`Waiting for backend to become ready... (${elapsedSeconds}s) ${spinnerChar}`);
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
    console.log('Backend is ready. Launching frontend.');
    startFrontend();
  } else {
    console.warn(`Backend did not become ready within ${backendReadyTimeoutMs / 1000} seconds. Launching frontend anyway.`);
    startFrontend();
  }
})();
