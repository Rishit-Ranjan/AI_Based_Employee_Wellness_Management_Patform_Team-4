/**
 * start-backend.cjs
 *
 * Spawns the Waitress Flask dev server using the project's Python venv
 * interpreter, so `npm run dev:server` / `npm:dev:backend` work WITHOUT
 * manually running `venv\Scripts\Activate.ps1`.
 *
 * Resolution order for the Python interpreter:
 *   1. WAITRESS_PYTHON env var (explicit override)
 *   2. backend/.venv  (team-standard venv location)
 *   3. .venv          (common root venv)
 *   4. venv           (legacy location)
 *   5. python / python.exe on PATH (covers an already-activated venv)
 *
 * Behaviour is identical whether or not the venv is pre-activated: after
 * activation the interpreter is simply found earlier via PATH.
 *
 * Usage:  node scripts/start-backend.cjs --listen=0.0.0.0:8000 ...
 *         (argv passed straight through to `python -m waitress <argv>`)
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const backendSrc = path.join(projectRoot, 'backend', 'src');
const pyExt = process.platform === 'win32' ? '.exe' : '';

// Candidate venv interpreter paths (highest priority first).
const venvCandidates = [];
if (process.env.WAITRESS_PYTHON) {
  venvCandidates.push(process.env.WAITRESS_PYTHON);
}
for (const name of ['venv', '.venv']) {
  venvCandidates.push(path.join(projectRoot, 'backend', name, 'Scripts', `python${pyExt}`));
  venvCandidates.push(path.join(projectRoot, 'backend', name, 'bin', 'python'));
  venvCandidates.push(path.join(projectRoot, name, 'Scripts', `python${pyExt}`));
  venvCandidates.push(path.join(projectRoot, name, 'bin', 'python'));
}
// Fallback: python on PATH (covers an already-activated venv or system python).
venvCandidates.push(process.platform === 'win32' ? 'python.exe' : 'python');

const findPython = () => {
  for (const c of venvCandidates) {
    try {
      if (fs.existsSync(c) || c === 'python' || c === 'python.exe') {
        // For the PATH fallback, verify it actually exists.
        if (c === 'python' || c === 'python.exe') {
          // spawn will fail later if missing; assume present.
          return c;
        }
        return c;
      }
    } catch {
      /* ignore and try next */
    }
  }
  return 'python';
};

const python = findPython();
// Pass through all CLI args to `python -m waitress`, defaulting to the
// canonical dev command if none were supplied.
const waitressArgs = process.argv.slice(2);
const args = waitressArgs.length
  ? waitressArgs
  : ['--listen=0.0.0.0:8000', '--threads=8', '--channel-timeout=20', 'flask_app:app'];

console.log('Launching Flask API with Waitress');

// A real interpreter (.exe) is spawned directly, so no shell is involved and
// no argument escaping is needed. Only shell shims (.cmd/.bat) and Windows
// Store execution aliases require one. For those we fold the argv into a
// single quoted command line, because Node emits the DEP0190 deprecation
// warning whenever an args array is combined with `shell: true`.
const shellQuote = (value) => {
  const s = String(value);
  return /[\s"^&|<>()]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pyArgs = ['-m', 'waitress', ...args];
const useShell =
  /\.(cmd|bat)$/i.test(python) ||
  (process.platform === 'win32' && /WindowsApps/i.test(python));

const pyProc = spawn(
  useShell ? [python, ...pyArgs].map(shellQuote).join(' ') : python,
  useShell ? [] : pyArgs,
  {
    cwd: backendSrc,
    stdio: 'inherit',
    shell: useShell,
  }
);

pyProc.on('error', (err) => {
  console.error(`[backend] ERROR: could not start Waitress - ${err.message}`);
  console.error('[backend] Make sure the Python venv exists and its dependencies are installed:');
  console.error('[backend]   .venv\\Scripts\\python.exe -m pip install -r requirements.txt');
  process.exit(1);
});

pyProc.on('exit', (code, signal) => {
  if (code) {
    console.error(`[backend] Waitress exited with code ${code}.`);
    process.exit(code);
  }
  if (signal) {
    console.error(`[backend] Waitress stopped (signal: ${signal}).`);
    process.exit(1);
  }
  console.log('[backend] Waitress stopped.');
  process.exit(0);
});

// Forward termination so Ctrl+C kills both this launcher and the child.
process.on('SIGTERM', () => { try { pyProc.kill('SIGTERM'); } catch (e) { /* ignore */ } });
process.on('SIGINT', () => { try { pyProc.kill('SIGINT'); } catch (e) { /* ignore */ } });
