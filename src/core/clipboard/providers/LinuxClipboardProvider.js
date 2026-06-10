const { fileURLToPath } = require('url');
const BaseClipboardProvider = require('./BaseClipboardProvider');
const { commandExists, runCommand } = require('../../platform/command');
const { getLinuxClipboardInstallHint } = require('../../platform/platform');

class LinuxClipboardProvider extends BaseClipboardProvider {
  constructor() {
    super();
    this.backend = this.detectBackend();
  }

  detectBackend() {
    const sessionType = (process.env.XDG_SESSION_TYPE || '').toLowerCase();

    if (sessionType === 'wayland' && commandExists('wl-paste') && commandExists('wl-copy')) {
      return 'wl-clipboard';
    }

    if (commandExists('xclip')) {
      return 'xclip';
    }

    if (commandExists('xsel')) {
      return 'xsel';
    }

    if (commandExists('wl-paste') && commandExists('wl-copy')) {
      return 'wl-clipboard';
    }

    return null;
  }

  readText() {
    try {
      if (this.backend === 'wl-clipboard') {
        return runCommand('wl-paste', ['--no-newline'], { timeout: 5000 });
      }

      if (this.backend === 'xclip') {
        return runCommand('xclip', ['-selection', 'clipboard', '-o'], {
          timeout: 5000
        }).replace(/\r?\n$/, '');
      }

      if (this.backend === 'xsel') {
        return runCommand('xsel', ['--clipboard', '--output'], { timeout: 5000 }).replace(
          /\r?\n$/,
          ''
        );
      }

      return '';
    } catch {
      return '';
    }
  }

  writeText(text) {
    if (this.backend === 'wl-clipboard') {
      runCommand('wl-copy', [], { input: text || '', timeout: 5000 });
      return;
    }

    if (this.backend === 'xclip') {
      runCommand('xclip', ['-selection', 'clipboard'], {
        input: text || '',
        timeout: 5000
      });
      return;
    }

    if (this.backend === 'xsel') {
      runCommand('xsel', ['--clipboard', '--input'], {
        input: text || '',
        timeout: 5000
      });
      return;
    }

    throw new Error(getLinuxClipboardInstallHint());
  }

  paste() {
    const sessionType = (process.env.XDG_SESSION_TYPE || '').toLowerCase();

    if (sessionType === 'wayland' && commandExists('wtype')) {
      runCommand('wtype', ['-M', 'ctrl', '-P', 'v', '-p', 'v', '-m', 'ctrl'], { timeout: 5000 });
      return;
    }

    if (commandExists('xdotool')) {
      runCommand('xdotool', ['key', 'ctrl+v'], { timeout: 5000 });
      return;
    }

    if (commandExists('wtype')) {
      runCommand('wtype', ['-M', 'ctrl', '-P', 'v', '-p', 'v', '-m', 'ctrl'], { timeout: 5000 });
      return;
    }

    throw new Error(this.getPasteInstallHint());
  }

  readFiles() {
    try {
      let output = '';
      if (this.backend === 'wl-clipboard') {
        output = runCommand('wl-paste', ['--type', 'text/uri-list', '--no-newline'], {
          timeout: 5000
        });
      } else if (this.backend === 'xclip') {
        output = runCommand('xclip', ['-selection', 'clipboard', '-t', 'text/uri-list', '-o'], {
          timeout: 5000
        });
      } else if (this.backend === 'xsel') {
        output = runCommand('xsel', ['--clipboard', '--output'], { timeout: 5000 });
      } else {
        return [];
      }

      return this.parseFileList(output);
    } catch {
      return [];
    }
  }

  parseFileList(value) {
    const uriPaths = this.parseUriList(value);
    if (uriPaths.length > 0) return uriPaths;

    return value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('/') || /^[a-zA-Z]:\\/.test(line)));
  }

  parseUriList(uriList) {
    return uriList
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        if (!line.startsWith('file://')) return null;
        try {
          return fileURLToPath(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  check() {
    const candidates = {
      wlClipboard: commandExists('wl-paste') && commandExists('wl-copy'),
      xclip: commandExists('xclip'),
      xsel: commandExists('xsel'),
      wtype: commandExists('wtype'),
      xdotool: commandExists('xdotool')
    };

    return {
      ok: !!this.backend,
      provider: this.backend,
      session: process.env.XDG_SESSION_TYPE || 'unknown',
      candidates,
      installHint: this.backend ? null : getLinuxClipboardInstallHint(),
      pasteHint: candidates.wtype || candidates.xdotool ? null : this.getPasteInstallHint()
    };
  }

  getPasteInstallHint() {
    return [
      'Linux paste automation backend not found. Install one of:',
      '  Wayland: sudo apt install wtype',
      '  X11: sudo apt install xdotool',
      '  Arch: sudo pacman -S wtype xdotool',
      '  Fedora: sudo dnf install wtype xdotool'
    ].join('\n');
  }
}

module.exports = LinuxClipboardProvider;
