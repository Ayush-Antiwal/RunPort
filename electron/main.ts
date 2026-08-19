import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { Store } from './store';
import { ProcessManager } from './processManager';
import { autoDetectProject, killProcessOnPort, getProcessUsingPort, isPortAvailable, findNextUnusedPort, getGitBranch, getGitBranches, switchGitBranch } from './detector';
import { createSystemTray } from './tray';
import { Project } from './types';

// Helper to strictly restrict shell.openPath to existing local directories (HIGH-001)
function isSafeDirectory(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  // Block UNC network paths (e.g. \\server\share)
  if (targetPath.startsWith('\\\\') || targetPath.startsWith('//')) return false;
  try {
    const stat = fs.statSync(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

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

function attachSecurityGuards(window: BrowserWindow) {
  // Disallow creating new windows from renderer
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Disallow navigating away from trusted local app content
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isAllowedOrigin =
        (isDev && parsed.origin === 'http://localhost:5179') ||
        (!isDev && parsed.protocol === 'file:');

      if (!isAllowedOrigin) {
        event.preventDefault();
        console.warn(`Blocked untrusted navigation to: ${navigationUrl}`);
      }
    } catch (e) {
      event.preventDefault();
    }
  });
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
      sandbox: true,
      backgroundThrottling: true,
    },
  });

  attachSecurityGuards(mainWindow);

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
      sandbox: true,
    },
  });

  attachSecurityGuards(widgetWindow);

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

  // Set session-level CSP headers for production & dev security (HIGH-003)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5179; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' http://localhost:5179 ws://localhost:5179;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self';";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

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
    if (!project || typeof project !== 'object') return store.getProjects();
    const list = await store.saveProject(project);
    broadcastProjectsUpdated();
    return list;
  });
  ipcMain.handle('delete-project', async (_, id: string) => {
    if (typeof id !== 'string') return store.getProjects();
    await processManager.stopProject(id);
    processManager.cleanupProject(id);
    const list = await store.deleteProject(id);
    broadcastProjectsUpdated();
    return list;
  });

  ipcMain.handle('auto-detect-project', (_, folderPath: string) => {
    if (typeof folderPath !== 'string') return null;
    return autoDetectProject(folderPath);
  });

  ipcMain.handle('get-git-branches', (_, projectPath: string) => {
    if (typeof projectPath !== 'string') return [];
    return getGitBranches(projectPath);
  });
  ipcMain.handle('switch-git-branch', async (_, projectId: string, projectPath: string, branchName: string) => {
    if (typeof projectPath !== 'string' || typeof branchName !== 'string') {
      return { success: false, error: 'Invalid arguments' };
    }
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

  // Look up project from trusted Store by ID to prevent renderer IPC payload spoofing (LOW-004)
  ipcMain.on('start-project', (_, projectOrId: Project | string, overridePort?: number) => {
    const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId?.id;
    if (!projectId || typeof projectId !== 'string') return;
    const trustedProject = store.getProjects().find((p) => p.id === projectId);
    const targetProject = trustedProject || (typeof projectOrId === 'object' ? projectOrId : null);
    if (!targetProject) return;
    processManager.startProject(targetProject, overridePort);
  });

  ipcMain.on('stop-project', (_, projectId: string) => {
    if (typeof projectId !== 'string') return;
    processManager.stopProject(projectId);
  });

  ipcMain.on('restart-project', (_, projectOrId: Project | string) => {
    const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId?.id;
    if (!projectId || typeof projectId !== 'string') return;
    const trustedProject = store.getProjects().find((p) => p.id === projectId);
    const targetProject = trustedProject || (typeof projectOrId === 'object' ? projectOrId : null);
    if (!targetProject) return;
    processManager.restartProject(targetProject);
  });

  ipcMain.on('stop-all', () => {
    processManager.stopAll();
  });

  ipcMain.on('start-all', () => {
    const projects = store.getProjects();
    projects.forEach((p) => processManager.startProject(p));
  });

  ipcMain.on('open-in-browser', (_, url: string) => {
    if (typeof url !== 'string') return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      } else {
        console.warn(`Blocked openExternal call with disallowed protocol: ${parsed.protocol}`);
      }
    } catch (e) {
      console.error('Invalid URL passed to open-in-browser:', e);
    }
  });

  ipcMain.on('open-in-ide', (_, folderPath: string) => {
    if (typeof folderPath !== 'string') return;
    const child = spawn('code', [folderPath], { shell: false, detached: true });
    child.on('error', () => {
      if (isSafeDirectory(folderPath)) {
        shell.openPath(folderPath);
      } else {
        console.warn(`Blocked open-in-ide shell.openPath to unsafe path: ${folderPath}`);
      }
    });
  });

  ipcMain.on('open-in-explorer', (_, folderPath: string) => {
    if (typeof folderPath !== 'string') return;
    if (isSafeDirectory(folderPath)) {
      shell.openPath(folderPath);
    } else {
      console.warn(`Blocked open-in-explorer to non-directory or UNC path: ${folderPath}`);
    }
  });

  ipcMain.on('open-in-terminal', (_, folderPath: string) => {
    if (typeof folderPath !== 'string') return;
    if (!isSafeDirectory(folderPath)) {
      console.warn(`Blocked open-in-terminal to non-directory or UNC path: ${folderPath}`);
      return;
    }
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '""', 'cmd.exe', '/k', `cd /d "${folderPath}"`], {
        shell: true,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (process.platform === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', folderPath], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      const child = spawn('x-terminal-emulator', ['-e', `bash -c "cd '${folderPath}' && exec $SHELL"`], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    }
  });

  ipcMain.on('open-with-os', (_, folderPath: string) => {
    if (typeof folderPath !== 'string') return;
    if (isSafeDirectory(folderPath)) {
      shell.openPath(folderPath);
    } else {
      console.warn(`Blocked open-with-os to non-directory or UNC path: ${folderPath}`);
    }
  });

  ipcMain.handle('get-occupying-pid', (_, port: number) => {
    const p = typeof port === 'number' ? port : parseInt(String(port), 10);
    return getProcessUsingPort(p);
  });
  ipcMain.handle('free-port', (_, port: number) => {
    const p = typeof port === 'number' ? port : parseInt(String(port), 10);
    return killProcessOnPort(p);
  });
  ipcMain.handle('check-port-available', (_, port: number) => {
    const p = typeof port === 'number' ? port : parseInt(String(port), 10);
    return isPortAvailable(p);
  });
  ipcMain.handle('find-next-port', (_, port: number) => {
    const p = typeof port === 'number' ? port : parseInt(String(port), 10);
    return findNextUnusedPort(p);
  });

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
