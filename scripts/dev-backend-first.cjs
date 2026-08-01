const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.resolve(projectRoot, 'backend', 'src');
const frontendDir = path.resolve(projectRoot, 'frontend');
const backendUrl = 'http://127.0.0.1:8000';
let frontendProcess;
let backendProcess;
let frontendStarted = false;

const spawnProcess = (command, args, cwd) => {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const proc = spawn(executable, args, {
    cwd,
    stdio: 'inherit',
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
  frontendProcess = spawnProcess('npm', ['run', 'dev', '--', '--host'], frontendDir);

  frontendProcess.on('exit', (code) => {
    cleanup(code || 0);
  });
};

backendProcess = spawnProcess('python', ['run_flask.py'], backendDir);

backendProcess.on('exit', (code) => {
  if (!frontendStarted) {
    console.warn('Backend exited before frontend started. Starting frontend anyway.');
    startFrontend();
  } else {
    console.warn(`Backend exited with code ${code}. Frontend will remain available at http://localhost:5173/`);
  }
});

waitOn({ resources: [backendUrl], timeout: 10000, interval: 500, tcpTimeout: 1000 })
  .then(() => {
    console.log('Backend is ready. Launching frontend.');
    startFrontend();
  })
  .catch(() => {
    console.warn('Backend did not become ready within 10 seconds. Starting frontend anyway.');
    startFrontend();
  });
