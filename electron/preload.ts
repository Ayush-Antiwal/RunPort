import { contextBridge, ipcRenderer } from 'electron';
import { Project, AppSettings } from './types';

export const api = {
  // Projects
  getProjects: (): Promise<Project[]> => ipcRenderer.invoke('get-projects'),
  saveProject: (project: Project): Promise<Project[]> => ipcRenderer.invoke('save-project', project),
  deleteProject: (id: string): Promise<Project[]> => ipcRenderer.invoke('delete-project', id),
  autoDetectProject: (folderPath: string) => ipcRenderer.invoke('auto-detect-project', folderPath),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),

  // Server Management
  startProject: (project: Project | string, overridePort?: number) => ipcRenderer.send('start-project', project, overridePort),
  stopProject: (projectId: string) => ipcRenderer.send('stop-project', projectId),
  restartProject: (project: Project | string) => ipcRenderer.send('restart-project', project),
  stopAll: () => ipcRenderer.send('stop-all'),
  startAll: () => ipcRenderer.send('start-all'),
  openInBrowser: (url: string) => ipcRenderer.send('open-in-browser', url),
  openInIDE: (folderPath: string) => ipcRenderer.send('open-in-ide', folderPath),
  openInExplorer: (folderPath: string) => ipcRenderer.send('open-in-explorer', folderPath),
  openInTerminal: (folderPath: string) => ipcRenderer.send('open-in-terminal', folderPath),
  openWithOS: (folderPath: string) => ipcRenderer.send('open-with-os', folderPath),
  getOccupyingPid: (port: number): Promise<number | null> => ipcRenderer.invoke('get-occupying-pid', port),
  freePort: (port: number): Promise<boolean> => ipcRenderer.invoke('free-port', port),
  checkPortAvailable: (port: number): Promise<boolean> => ipcRenderer.invoke('check-port-available', port),
  findNextPort: (port: number): Promise<number> => ipcRenderer.invoke('find-next-port', port),

  // Logs & State
  getProjectStates: () => ipcRenderer.invoke('get-project-states'),
  getProjectLogs: (projectId: string) => ipcRenderer.invoke('get-project-logs', projectId),
  clearProjectLogs: (projectId: string) => ipcRenderer.send('clear-project-logs', projectId),
  getGitBranches: (projectPath: string): Promise<string[]> => ipcRenderer.invoke('get-git-branches', projectPath),
  switchGitBranch: (projectId: string, projectPath: string, branchName: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('switch-git-branch', projectId, projectPath, branchName),

  // Settings & Window
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('update-settings', settings),
  toggleWidgetWindow: () => ipcRenderer.send('toggle-widget-window'),
  openDashboard: () => ipcRenderer.send('open-dashboard'),

  // Memory Metrics & Optimization
  getAppMemoryInfo: (): Promise<{ workingSetSizeMb: number; heapUsedMb: number }> => ipcRenderer.invoke('get-app-memory-info'),
  triggerGC: () => ipcRenderer.send('trigger-gc'),

  // Listeners
  onProjectStateChanged: (callback: (data: { projectId: string; state: any }) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('project-state-changed', subscription);
    return () => ipcRenderer.removeListener('project-state-changed', subscription);
  },
  onProjectLogAdded: (callback: (log: any) => void) => {
    const subscription = (_: any, log: any) => callback(log);
    ipcRenderer.on('project-log-added', subscription);
    return () => ipcRenderer.removeListener('project-log-added', subscription);
  },
  onProjectLogsBatched: (callback: (data: { projectId: string; logs: any[] }) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('project-logs-batched', subscription);
    return () => ipcRenderer.removeListener('project-logs-batched', subscription);
  },
  onProjectLogsCleared: (callback: (data: { projectId: string }) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('project-logs-cleared', subscription);
    return () => ipcRenderer.removeListener('project-logs-cleared', subscription);
  },
  onProjectsUpdated: (callback: (projects: Project[]) => void) => {
    const subscription = (_: any, list: Project[]) => callback(list);
    ipcRenderer.on('projects-updated', subscription);
    return () => ipcRenderer.removeListener('projects-updated', subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
