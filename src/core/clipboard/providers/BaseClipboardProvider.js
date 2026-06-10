const ClipboardItem = require('../ClipboardItem');

class BaseClipboardProvider {
  readText() {
    throw new Error('readText() not implemented');
  }

  writeText() {
    throw new Error('writeText() not implemented');
  }

  readFiles() {
    return [];
  }

  read() {
    const files = this.readFiles();
    if (files.length > 0) {
      return ClipboardItem.fromFiles(files);
    }

    const text = this.readText();
    if (!text) {
      return null;
    }

    return ClipboardItem.fromText(text);
  }

  check() {
    return {
      ok: false,
      provider: this.constructor.name,
      reason: 'not implemented'
    };
  }
}

module.exports = BaseClipboardProvider;
