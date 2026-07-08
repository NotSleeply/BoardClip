const BaseClipboardProvider = require('./BaseClipboardProvider');
const { runCommand } = require('../../platform/command');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
    const tmpFile = path.join(os.tmpdir(), `bc-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, text || '', 'utf8');
    try {
      runCommand('powershell', [
        '-NoProfile',
        '-Command',
        `Get-Content '${tmpFile}' -Encoding UTF8 -Raw | Set-Clipboard`
      ], { timeout: 5000 });
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { }
    }
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
