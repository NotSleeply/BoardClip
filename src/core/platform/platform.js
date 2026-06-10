function getPlatformInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    linuxSession: process.env.XDG_SESSION_TYPE || null,
    desktop: process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || null
  };
}

function getLinuxClipboardInstallHint() {
  return [
    'Linux clipboard backend not found. Install one of:',
    '  Ubuntu/Debian X11: sudo apt install xclip',
    '  Ubuntu/Debian Wayland: sudo apt install wl-clipboard',
    '  Arch: sudo pacman -S xclip wl-clipboard',
    '  Fedora: sudo dnf install xclip wl-clipboard'
  ].join('\n');
}

module.exports = {
  getPlatformInfo,
  getLinuxClipboardInstallHint
};
