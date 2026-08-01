const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.resolve(projectRoot, 'backend', 'src');
const frontendDir = path.resolve(projectRoot, 'frontend');
const backendUrl = 'http://127.0.0.1:8000';
const venvPython = path.resolve(projectRoot, '.venv', 'Scripts', 'python.exe');
const pythonCommand = process.platform === 'win32' && require('fs').existsSync(venvPython)
  ? venvPython
  : 'python';
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

backendProcess = spawnProcess(pythonCommand, ['run_flask.py'], backendDir);

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

const waitForBackend = async (timeoutMs = 10000, intervalMs = 500) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await isBackendReady();
    if (ready) {
      return true;
    }
    if (backendExitedEarly) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
};

(async () => {
  const ready = await waitForBackend(10000, 500);
  if (ready) {
    if (waitOnHandled) return;
    waitOnHandled = true;
    console.log('Backend is ready. Launching frontend.');
    startFrontend();
  } else {
    console.warn('Backend did not become ready within 10 seconds. Launching frontend anyway.');
    startFrontend();
  }
})();
