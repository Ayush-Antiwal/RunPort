import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import { Store } from './store';
import { ProcessManager } from './processManager';
import { autoDetectProject, killProcessOnPort, getProcessUsingPort, isPortAvailable, findNextUnusedPort, getGitBranch, getGitBranches, switchGitBranch } from './detector';
import { createSystemTray } from './tray';
import { Project } from './types';

// Optimize Electron V8 Memory Footprint (Cap V8 heap & collapse renderer processes)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --expose-gc');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let store: Store;
let processManager: ProcessManager;

const isDev = process.env.NODE_ENV === 'development';

function getViteUrl(hash: string = '') {
  if (isDev) {
    return `http://localhost:5179${hash}`;
  }
  return `file://${path.join(__dirname, '../dist/index.html')}${hash}`;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 500,
    minHeight: 300,
    title: 'RunPort',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: true,
    },
  });

  mainWindow.loadURL(getViteUrl('#/dashboard'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('minimize', () => {
    // Memory Compaction on Minimize
    if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  });

  mainWindow.on('close', (event) => {
    const settings = store.getSettings();
    if (settings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
      if (global.gc) {
        try { global.gc(); } catch (e) {}
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createWidgetWindow() {
  const settings = store.getSettings();
  
  // A valid 32x32 blue/cyan square PNG icon (base64 encoded) so it loads correctly in Windows taskbar/system tray
  const widgetIcon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAAC01SahAAAAbklEQVRYCe1XwQoAIAiD/v8n99xChKAu2p5EkMpqbrNuZkRkiWifgLg9gA+A4K4D8gQpB5g9QcoBZk+QcoDZE6QcYPYEKafeA+3e4q8BvP7gLgB8AAR3HZDn12PvRjDqj896nN42c0XUBg9a/hWz6xP4ogAAAABJRU5ErkJggg==',
      'base64'
    )
  );

  widgetWindow = new BrowserWindow({
    width: 320,
    height: 240,
    minWidth: 320,
    minHeight: 240,
    x: settings.widgetPosition?.x,
    y: settings.widgetPosition?.y,
    resizable: true,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.widgetAlwaysOnTop,
    skipTaskbar: false, // Ensure it is shown in the taskbar
    icon: widgetIcon,   // Assign native icon to the window
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  widgetWindow.loadURL(getViteUrl('#/widget'));

  widgetWindow.on('moved', () => {
    if (widgetWindow) {
      const [x, y] = widgetWindow.getPosition();
      store.updateSettings({ widgetPosition: { x, y } });
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

function toggleWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide();
    } else {
      widgetWindow.show();
    }
  } else {
    createWidgetWindow();
  }
}

app.whenReady().then(() => {
  store = new Store();
  processManager = new ProcessManager(() => [mainWindow, widgetWindow]);

  createMainWindow();

  createSystemTray(
    () => mainWindow,
    () => widgetWindow,
    toggleWidgetWindow,
    () => {
      const projects = store.getProjects();
      projects.forEach((p) => processManager.startProject(p));
    },
    () => {
      processManager.stopAll();
    }
  );

  const broadcastProjectsUpdated = () => {
    const list = store.getProjects();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projects-updated', list);
    }
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.webContents.send('projects-updated', list);
    }
  };

  // Setup IPC Handlers
  ipcMain.handle('get-projects', () => store.getProjects());
  ipcMain.handle('save-project', async (_, project: Project) => {
    const list = await store.saveProject(project);
    broadcastProjectsUpdated();
    return list;
  });
  ipcMain.handle('delete-project', async (_, id: string) => {
    await processManager.stopProject(id);
    processManager.cleanupProject(id);
    const list = await store.deleteProject(id);
    broadcastProjectsUpdated();
    return list;
  });

  ipcMain.handle('auto-detect-project', (_, folderPath: string) => autoDetectProject(folderPath));

  ipcMain.handle('get-git-branches', (_, projectPath: string) => getGitBranches(projectPath));
  ipcMain.handle('switch-git-branch', async (_, projectId: string, projectPath: string, branchName: string) => {
    const result = await switchGitBranch(projectPath, branchName);
    if (result.success) {
      const gitBranch = getGitBranch(projectPath);
      processManager.broadcastStateChange(projectId, { gitBranch });
    }
    return result;
  });

  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.on('start-project', (_, project: Project, overridePort?: number) => {
    processManager.startProject(project, overridePort);
  });

  ipcMain.on('stop-project', (_, projectId: string) => {
    processManager.stopProject(projectId);
  });

  ipcMain.on('restart-project', (_, project: Project) => {
    processManager.restartProject(project);
  });

  ipcMain.on('stop-all', () => {
    processManager.stopAll();
  });

  ipcMain.on('start-all', () => {
    const projects = store.getProjects();
    projects.forEach((p) => processManager.startProject(p));
  });

  ipcMain.on('open-in-browser', (_, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on('open-in-ide', (_, folderPath: string) => {
    const cmd = process.platform === 'win32' ? `code "${folderPath}"` : `code "${folderPath}"`;
    exec(cmd, (err) => {
      if (err) {
        shell.openPath(folderPath);
      }
    });
  });

  ipcMain.on('open-in-explorer', (_, folderPath: string) => {
    shell.openPath(folderPath);
  });

  ipcMain.on('open-in-terminal', (_, folderPath: string) => {
    if (process.platform === 'win32') {
      exec(`start cmd /K "cd /d "${folderPath}""`);
    } else {
      exec(`open -a Terminal "${folderPath}"`);
    }
  });

  ipcMain.on('open-with-os', (_, folderPath: string) => {
    if (process.platform === 'win32') {
      exec(`RUNDLL32.EXE shell32.dll,OpenAs_RunDLL "${folderPath}"`);
    } else if (process.platform === 'darwin') {
      exec(`open -a Finder "${folderPath}"`);
    } else {
      exec(`xdg-open "${folderPath}"`);
    }
  });

  ipcMain.handle('get-occupying-pid', (_, port: number) => getProcessUsingPort(port));
  ipcMain.handle('free-port', (_, port: number) => killProcessOnPort(port));
  ipcMain.handle('check-port-available', (_, port: number) => isPortAvailable(port));
  ipcMain.handle('find-next-port', (_, port: number) => findNextUnusedPort(port));

  ipcMain.handle('get-project-states', () => processManager.getAllStates());
  ipcMain.handle('get-project-logs', (_, projectId: string) => processManager.getLogs(projectId));
  ipcMain.on('clear-project-logs', (_, projectId: string) => processManager.clearLogs(projectId));

  ipcMain.handle('get-settings', () => store.getSettings());
  ipcMain.handle('update-settings', (_, newSettings: Partial<any>) => {
    const updated = store.updateSettings(newSettings);
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setAlwaysOnTop(updated.widgetAlwaysOnTop);
    }
    return updated;
  });

  ipcMain.handle('get-app-memory-info', async () => {
    const memoryInfo = await process.getProcessMemoryInfo();
    const memUsage = process.memoryUsage();
    const rssBytes = memoryInfo.residentSet || memUsage.rss;
    return {
      workingSetSizeMb: Math.round(rssBytes / (1024 * 1024)),
      heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
    };
  });

  ipcMain.on('trigger-gc', () => {
    if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  });

  ipcMain.on('toggle-widget-window', () => toggleWidgetWindow());
  ipcMain.on('open-dashboard', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
});

app.on('before-quit', async () => {
  if (processManager) {
    await processManager.stopAll();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    processManager?.stopAll();
    app.quit();
  }
});
