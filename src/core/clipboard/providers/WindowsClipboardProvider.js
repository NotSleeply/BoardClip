const BaseClipboardProvider = require('./BaseClipboardProvider');
const { runCommand } = require('../../platform/command');

class WindowsClipboardProvider extends BaseClipboardProvider {
  readText() {
    try {
      return runCommand(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard'
        ],
        { timeout: 5000 }
      ).replace(/\r?\n$/, '');
    } catch {
      return '';
    }
  }

  writeText(text) {
    runCommand('powershell', ['-NoProfile', '-Command', '$Input | Set-Clipboard'], {
      input: Buffer.from(text || '', 'utf8'),
      timeout: 5000
    });
  }

  readFiles() {
    try {
      const output = runCommand(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }'
        ],
        { timeout: 5000 }
      );

      return output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  check() {
    return {
      ok: true,
      provider: 'windows-powershell',
      read: 'Get-Clipboard',
      write: 'Set-Clipboard',
      files: 'Get-Clipboard -Format FileDropList'
    };
  }
}

module.exports = WindowsClipboardProvider;
