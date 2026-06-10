const BaseClipboardProvider = require('./BaseClipboardProvider');
const { commandExists, runCommand } = require('../../platform/command');

class MacClipboardProvider extends BaseClipboardProvider {
  readText() {
    try {
      return runCommand('pbpaste', [], { timeout: 5000 }).replace(/\r?\n$/, '');
    } catch {
      return '';
    }
  }

  writeText(text) {
    runCommand('pbcopy', [], {
      input: text || '',
      timeout: 5000
    });
  }

  readFiles() {
    try {
      const output = runCommand(
        'osascript',
        [
          '-e',
          'try',
          '-e',
          'set theFile to the clipboard as «class furl»',
          '-e',
          'return POSIX path of theFile',
          '-e',
          'on error',
          '-e',
          'return ""',
          '-e',
          'end try'
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
    const hasPbPaste = commandExists('pbpaste');
    const hasPbCopy = commandExists('pbcopy');

    return {
      ok: hasPbPaste && hasPbCopy,
      provider: 'macos-pbcopy-pbpaste',
      read: 'pbpaste',
      write: 'pbcopy',
      files: 'osascript file URL',
      candidates: {
        pbpaste: hasPbPaste,
        pbcopy: hasPbCopy
      }
    };
  }
}

module.exports = MacClipboardProvider;
