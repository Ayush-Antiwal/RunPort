import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

export function createSystemTray(
  mainWindowGetter: () => BrowserWindow | null,
  widgetWindowGetter: () => BrowserWindow | null,
  toggleWidget: () => void,
  startAll: () => void,
  stopAll: () => void
): Tray {
  let iconPath = path.join(app.getAppPath(), 'RunPort.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    iconPath = path.join(__dirname, 'assets', 'icon.png');
    icon = nativeImage.createFromPath(iconPath);
  }
  if (icon.isEmpty()) {
    icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSU56GgoAAAANSU5EUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR42mNkYPj/nwEHYESlYWSgHDAaAEwDE0NzBkwD08AE0ZwB08A0MEE0Z8BA5wAA6S4W5pYn1K0AAAAASUVORK5CYII=',
        'base64'
      )
    );
  }

  const tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Local Server Manager');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        const mainWin = mainWindowGetter();
        if (mainWin) {
          if (mainWin.isMinimized()) mainWin.restore();
          mainWin.show();
          mainWin.focus();
        }
      },
    },
    {
      label: 'Toggle Floating Desktop Widget',
      click: () => {
        toggleWidget();
      },
    },
    { type: 'separator' },
    {
      label: 'Start All Servers',
      click: () => startAll(),
    },
    {
      label: 'Stop All Servers',
      click: () => stopAll(),
    },
    { type: 'separator' },
    {
      label: 'Quit Local Server Manager',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single-click on system tray icon toggles / opens the floating desktop widget
  tray.on('click', () => {
    toggleWidget();
  });

  tray.on('double-click', () => {
    const mainWin = mainWindowGetter();
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    } else {
      toggleWidget();
    }
  });

  return tray;
}
