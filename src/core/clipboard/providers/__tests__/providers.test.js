import { describe, test, expect } from 'vitest';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  createClipboardProvider,
  LinuxClipboardProvider,
  MacClipboardProvider,
  WindowsClipboardProvider
} from '../index.js';

describe('Clipboard providers', () => {
  test('createClipboardProvider 应该按当前平台创建 provider', () => {
    const provider = createClipboardProvider();

    if (process.platform === 'win32') {
      expect(provider).toBeInstanceOf(WindowsClipboardProvider);
    } else if (process.platform === 'darwin') {
      expect(provider).toBeInstanceOf(MacClipboardProvider);
    } else if (process.platform === 'linux') {
      expect(provider).toBeInstanceOf(LinuxClipboardProvider);
    } else {
      expect(provider).toBeDefined();
    }
  });

  test('LinuxClipboardProvider 应该解析 text/uri-list 文件路径', () => {
    const provider = Object.create(LinuxClipboardProvider.prototype);
    const firstPath = path.resolve('/tmp/a.txt');
    const secondPath = path.resolve('/tmp/b file.txt');
    const uriList = [
      '# comment',
      pathToFileURL(firstPath).href,
      pathToFileURL(secondPath).href
    ].join('\n');

    expect(provider.parseUriList(uriList)).toEqual([firstPath, secondPath]);
  });

  test('LinuxClipboardProvider 应该从 xsel 文本输出解析文件路径', () => {
    const provider = Object.create(LinuxClipboardProvider.prototype);
    const firstPath = path.resolve('/tmp/a.txt');
    const secondPath = path.resolve('/tmp/b.txt');

    expect(provider.parseFileList(`${firstPath}\n${secondPath}\nnot-a-path`)).toEqual([
      firstPath,
      secondPath
    ]);
  });

  test('LinuxClipboardProvider 应该提供 paste 依赖安装提示', () => {
    const provider = Object.create(LinuxClipboardProvider.prototype);

    expect(provider.getPasteInstallHint()).toContain('wtype');
    expect(provider.getPasteInstallHint()).toContain('xdotool');
  });
});
