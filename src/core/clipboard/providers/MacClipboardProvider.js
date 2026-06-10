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

  paste() {
    runCommand(
      'osascript',
      ['-e', 'tell application "System Events" to keystroke "v" using command down'],
      { timeout: 5000 }
    );
  }

  readFiles() {
    try {
      const output = runCommand(
        'osascript',
        [
          '-e',
          'use framework "Foundation"',
          '-e',
          'use framework "AppKit"',
          '-e',
          'use scripting additions',
          '-e',
          "set pb to current application's NSPasteboard's generalPasteboard()",
          '-e',
          "set urls to pb's readObjectsForClasses:{current application's NSURL} options:(missing value)",
          '-e',
          'set output to {}',
          '-e',
          'repeat with u in urls',
          '-e',
          "if (u's isFileURL()) as boolean then set end of output to (u's |path|()) as text",
          '-e',
          'end repeat',
          '-e',
          "set AppleScript's text item delimiters to linefeed",
          '-e',
          'return output as text'
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
      paste: 'System Events Cmd+V',
      files: 'AppKit NSPasteboard file URLs',
      candidates: {
        pbpaste: hasPbPaste,
        pbcopy: hasPbCopy,
        osascript: commandExists('osascript')
      }
    };
  }
}

module.exports = MacClipboardProvider;
