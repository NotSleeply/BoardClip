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
    const b64 = Buffer.from(text || '', 'utf8').toString('base64');
    runCommand(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Set-Clipboard -Value ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')))`
      ],
      { timeout: 5000 }
    );
  }

  paste() {
    runCommand(
      'powershell',
      [
        '-NoProfile',
        '-STA',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
      ],
      { timeout: 5000 }
    );
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
      paste: 'SendKeys Ctrl+V',
      files: 'Get-Clipboard -Format FileDropList'
    };
  }
}

module.exports = WindowsClipboardProvider;
