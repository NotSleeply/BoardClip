const WindowsClipboardProvider = require('./WindowsClipboardProvider');
const MacClipboardProvider = require('./MacClipboardProvider');
const LinuxClipboardProvider = require('./LinuxClipboardProvider');

function createClipboardProvider() {
  if (process.platform === 'win32') {
    return new WindowsClipboardProvider();
  }

  if (process.platform === 'darwin') {
    return new MacClipboardProvider();
  }

  if (process.platform === 'linux') {
    return new LinuxClipboardProvider();
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

module.exports = {
  createClipboardProvider,
  WindowsClipboardProvider,
  MacClipboardProvider,
  LinuxClipboardProvider
};
