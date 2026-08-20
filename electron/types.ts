export type FrameworkType = 
  | 'nextjs'
  | 'vite'
  | 'react'
  | 'angular'
  | 'vue'
  | 'nuxt'
  | 'nestjs'
  | 'express'
  | 'python'
  | 'go'
  | 'generic';

export type ServerStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'failed';

export interface Project {
  id: string;
  name: string;
  path: string;
  framework: FrameworkType;
  command: string;
  port: number;
  autoStart?: boolean;
  idleAutoStopEnabled?: boolean;
  idleTimeoutMinutes?: number;
  environmentVars?: Record<string, string>;
  maxMemoryMb?: number;
  createdAt: string;
}

export interface ProjectRuntimeState {
  status: ServerStatus;
  pid?: number;
  startedAt?: string;
  actualPort?: number;
  error?: string;
  allocatedMemoryCapMb?: number;
  gitBranch?: string;
  isSleeping?: boolean;
  memoryMb?: number;
  lastActivityAt?: string;
  autoStoppedReason?: 'idle' | 'suspend' | 'memory-limit' | 'app-quit';
}

export interface AppSettings {
  widgetAlwaysOnTop: boolean;
  widgetPosition?: { x: number; y: number };
  startAtLogin: boolean;
  minimizeToTray: boolean;
  enableDynamicMemory: boolean;
  defaultMaxMemoryMb: number;
  enableAppMemoryOptimization: boolean;
  enableIdleAutoStop?: boolean;
  idleTimeoutMinutes?: number;
  stopServersOnAppClose?: boolean;
  autoStopOnSystemSuspend?: boolean;
}

export interface LogLine {
  id: string;
  projectId: string;
  text: string;
  type: 'stdout' | 'stderr' | 'system';
  timestamp: string;
}

