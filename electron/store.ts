import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Project, AppSettings } from './types';

interface StoreData {
  projects: Project[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  widgetAlwaysOnTop: true,
  startAtLogin: false,
  minimizeToTray: true,
  enableDynamicMemory: true,
  defaultMaxMemoryMb: 1024,
  enableAppMemoryOptimization: true,
};

export class Store {
  private filePath: string;
  private data: StoreData;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'projects.json');
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          projects: parsed.projects || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
    }
    return { projects: [], settings: DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save store data:', err);
    }
  }

  public getProjects(): Project[] {
    return this.data.projects;
  }

  public saveProject(project: Project): Project[] {
    const idx = this.data.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.data.projects[idx] = project;
    } else {
      this.data.projects.push(project);
    }
    this.save();
    return this.data.projects;
  }

  public deleteProject(id: string): Project[] {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.save();
    return this.data.projects;
  }

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }
}
