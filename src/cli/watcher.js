const path = require('path');
const fs = require('fs');
const os = require('os');
const { fileURLToPath } = require('url');
const ClipboardItem = require('../core/clipboard/ClipboardItem');

const logDir = path.join(os.homedir(), '.board-clip', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'watcher.log');
function writeLog(level, ...args) {
  const msg = `[${level}] ${args.join(' ')}`;
  const line = `${new Date().toISOString()} ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(logFile, line);
  } catch {}
}

const log = {
  info: (...args) => writeLog('INFO', ...args),
  warn: (...args) => writeLog('WARN', ...args),
  error: (...args) => writeLog('ERROR', ...args),
  debug: (...args) => writeLog('DEBUG', ...args)
};

async function main() {
  log.info('[Watcher] 剪贴板监控守护进程启动');

  const Database = require('../core/database/Database');
  const ClipboardWatcher = require('../core/clipboard/ClipboardWatcher');
  const AI = require('../core/ai/AIService');

  const dataDir = process.env.BOARD_CLIP_DATA || path.join(os.homedir(), '.board-clip');

  const db = new Database(dataDir);
  await db._init();

  function readText() {
    const { execSync } = require('child_process');
    try {
      if (process.platform === 'win32') {
        return execSync(
          'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard"',
          {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 5000
          }
        ).replace(/\r?\n$/, '');
      } else if (process.platform === 'darwin') {
        return execSync('pbpaste', { encoding: 'utf8', timeout: 5000 }).replace(/\r?\n$/, '');
      } else {
        return execSync('xclip -selection clipboard -o', {
          encoding: 'utf8',
          timeout: 5000
        }).replace(/\r?\n$/, '');
      }
    } catch {
      return '';
    }
  }

  function parseUriList(uriList) {
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

  function readFiles() {
    const { execSync } = require('child_process');
    try {
      if (process.platform === 'win32') {
        const output = execSync(
          'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }"',
          { encoding: 'utf8', windowsHide: true, timeout: 5000 }
        );
        return output
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);
      }

      if (process.platform === 'darwin') {
        const output = execSync(
          `osascript -e 'try' -e 'set theFile to the clipboard as «class furl»' -e 'return POSIX path of theFile' -e 'on error' -e 'return ""' -e 'end try'`,
          { encoding: 'utf8', timeout: 5000 }
        );
        return output
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);
      }

      const output = execSync('xclip -selection clipboard -t text/uri-list -o', {
        encoding: 'utf8',
        timeout: 5000
      });
      return parseUriList(output);
    } catch {
      return [];
    }
  }

  const clipboard = {
    readText,
    read: () => {
      const files = readFiles();
      if (files.length > 0) return ClipboardItem.fromFiles(files);

      const text = readText();
      if (!text) return null;
      return ClipboardItem.fromText(text);
    },
    readImage: () => null
  };

  const watcher = new ClipboardWatcher(db, clipboard, log, AI);
  watcher.start();

  log.info('[Watcher] 监控已启动');

  process.on('SIGTERM', () => {
    log.info('[Watcher] 收到 SIGTERM，正在停止...');
    watcher.stop();
    db.close();
    const pidFile = path.join(dataDir, 'watcher.pid');
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    watcher.stop();
    db.close();
    process.exit(0);
  });

  process.on('uncaughtException', err => {
    log.error('[Watcher] Uncaught Exception:', err);
  });

  process.on('unhandledRejection', reason => {
    log.error('[Watcher] Unhandled Rejection:', reason);
  });
}

main().catch(err => {
  log.error('[Watcher] 启动失败:', err);
  process.exit(1);
});
