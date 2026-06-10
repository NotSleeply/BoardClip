const crypto = require('crypto');

class ClipboardItem {
  constructor({
    type,
    content,
    html = null,
    filePath = null,
    mimeType = null,
    width = 0,
    height = 0,
    hash = null,
    subtype = null,
    fileSize = 0
  }) {
    this.type = type || 'text';
    this.content = content || '';
    this.html = html;
    this.filePath = filePath;
    this.mimeType = mimeType;
    this.width = width || 0;
    this.height = height || 0;
    this.subtype = subtype;
    this.fileSize = fileSize || 0;
    this.hash = hash || ClipboardItem.createHash(this);
  }

  static createHash(item) {
    const parts = [
      item.type || '',
      item.content || '',
      item.html || '',
      item.filePath || '',
      item.mimeType || '',
      String(item.width || 0),
      String(item.height || 0),
      String(item.fileSize || 0)
    ];

    return crypto.createHash('sha256').update(parts.join('\0'), 'utf8').digest('hex');
  }

  static fromText(text) {
    return new ClipboardItem({ type: 'text', content: text || '' });
  }

  static fromFiles(files) {
    const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    const content =
      normalizedFiles.length === 1 ? normalizedFiles[0] : JSON.stringify(normalizedFiles);

    return new ClipboardItem({
      type: 'file',
      content,
      filePath: normalizedFiles.length === 1 ? normalizedFiles[0] : null,
      subtype: normalizedFiles.length > 1 ? 'files' : 'file'
    });
  }
}

module.exports = ClipboardItem;
