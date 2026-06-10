const { spawnSync } = require('child_process');

function commandExists(command) {
  const checker = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];

  const result = spawnSync(checker, args, {
    stdio: 'ignore',
    shell: process.platform !== 'win32',
    windowsHide: true
  });

  return result.status === 0;
}

function runCommand(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.encoding || 'utf8',
    input: options.input,
    timeout: options.timeout || 5000,
    windowsHide: true,
    shell: options.shell || false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }

  return result.stdout || '';
}

module.exports = {
  commandExists,
  runCommand
};
