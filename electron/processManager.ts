import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import kill from 'tree-kill';
import os from 'os';
import { BrowserWindow } from 'electron';
import { Project, ProjectRuntimeState, LogLine } from './types';
import { getGitBranch, isPortAvailable, findNextUnusedPort, clearPortPidCache } from './detector';

export class ProcessManager {
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private states: Map<string, ProjectRuntimeState> = new Map();
  private logs: Map<string, LogLine[]> = new Map();
  private pendingLogsQueue: Map<string, LogLine[]> = new Map();
  private projectConfigMap: Map<string, Project> = new Map();
  private windowGetter: () => (BrowserWindow | null)[];
  private startupTimers: Map<string, NodeJS.Timeout> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(windowGetter: () => (BrowserWindow | null)[]) {
    this.windowGetter = windowGetter;
    this.startLogFlushTimer();
  }

  private startLogFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushPendingLogs();
    }, 50);
  }

  private flushPendingLogs() {
    if (this.pendingLogsQueue.size === 0) return;

    const windows = this.windowGetter();
    for (const [projectId, pendingBatch] of this.pendingLogsQueue.entries()) {
      if (pendingBatch.length === 0) continue;
      const batchCopy = [...pendingBatch];
      this.pendingLogsQueue.set(projectId, []);

      windows.forEach((win) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('project-logs-batched', { projectId, logs: batchCopy });
        }
      });
    }
  }

  private clearStartupTimer(projectId: string) {
    const timer = this.startupTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.startupTimers.delete(projectId);
    }
  }

  private stripAnsi(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  }

  private markRunning(project: Project, pid: number, detectedPort?: number) {
    const state = this.getState(project.id);
    const actualPort = detectedPort || state.actualPort || project.port;
    const gitBranch = getGitBranch(project.path);
    this.clearStartupTimer(project.id);
    this.broadcastStateChange(project.id, {
      status: 'running',
      pid,
      startedAt: state.startedAt || new Date().toISOString(),
      actualPort,
      gitBranch,
    });
  }

  private checkLogLineForPortAndState(project: Project, pid: number, line: string) {
    const cleanLine = this.stripAnsi(line);
    const urlPortMatch = cleanLine.match(/http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d+)/i);
    let detectedPort: number | undefined;
    if (urlPortMatch && urlPortMatch[1]) {
      detectedPort = parseInt(urlPortMatch[1], 10);
    }

    const READY_PATTERNS = [
      /local:\s+http/i,
      /http:\/\/(localhost|127\.0\.0\.1)/i,
      /ready in/i,
      /server (is )?running/i,
      /listening (on|at)/i,
      /compiled (successfully|in)/i,
      /app (is )?running/i,
      /started server/i,
      /started at/i,
      /development server/i,
    ];

    const state = this.getState(project.id);
    if (state.status === 'starting') {
      if (detectedPort || READY_PATTERNS.some((p) => p.test(cleanLine))) {
        this.markRunning(project, pid, detectedPort);
      }
    } else if (state.status === 'running' && detectedPort && state.actualPort !== detectedPort) {
      this.broadcastStateChange(project.id, {
        ...state,
        actualPort: detectedPort,
      });
    }
  }

  public getState(projectId: string): ProjectRuntimeState {
    return this.states.get(projectId) || { status: 'idle' };
  }

  public getAllStates(): Record<string, ProjectRuntimeState> {
    const res: Record<string, ProjectRuntimeState> = {};
    for (const [id, state] of this.states.entries()) {
      res[id] = state;
    }
    return res;
  }

  public getLogs(projectId: string): LogLine[] {
    return this.logs.get(projectId) || [];
  }

  public broadcastStateChange(projectId: string, partialState: Partial<ProjectRuntimeState>) {
    const currentState = this.getState(projectId);
    const newState = { ...currentState, ...partialState };
    this.states.set(projectId, newState);
    const windows = this.windowGetter();
    windows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('project-state-changed', { projectId, state: newState });
      }
    });
  }

  private broadcastLog(projectId: string, log: LogLine) {
    let list = this.logs.get(projectId);
    if (!list) {
      list = [];
      this.logs.set(projectId, list);
    }
    list.push(log);
    if (list.length > 300) {
      list.shift();
    }

    let queue = this.pendingLogsQueue.get(projectId);
    if (!queue) {
      queue = [];
      this.pendingLogsQueue.set(projectId, queue);
    }
    queue.push(log);
  }

  private calculateDynamicMemoryLimit(project: Project): number {
    if (project.maxMemoryMb && project.maxMemoryMb > 0) {
      return project.maxMemoryMb;
    }

    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const activeCount = Math.max(1, this.activeProcesses.size + 1);

    // Reserve 25% for OS / Electron app, divide remainder among active servers, clamped between 512MB and 2048MB
    const allocatedPerServer = Math.round((totalMemMb * 0.75) / activeCount);
    return Math.max(512, Math.min(2048, allocatedPerServer));
  }

  private getEffectiveCommandAndEnv(project: Project, targetPort: number): { command: string; env: Record<string, string>; allocatedCap: number } {
    const allocatedCap = this.calculateDynamicMemoryLimit(project);

    // Inject safe NODE_OPTIONS heap limit and disable watcher polling loops
    const existingNodeOptions = process.env.NODE_OPTIONS || '';
    const nodeOptions = `${existingNodeOptions} --max-old-space-size=${allocatedCap}`.trim();

    // Disallow dangerous runtime/system environment variable overrides from untrusted project configs
    const BLOCKED_ENV_KEYS = new Set([
      'NODE_OPTIONS',
      'ELECTRON_RUN_AS_NODE',
      'PYTHONPATH',
      'PERLLIB',
      'PERL5LIB',
      'RUBYLIB',
      'COMSPEC',
      'PATH',
      'PATHEXT',
      'LD_PRELOAD',
      'LD_LIBRARY_PATH',
      'DYLD_INSERT_LIBRARIES',
      'DYLD_LIBRARY_PATH',
    ]);

    const sanitizedCustomEnv: Record<string, string> = {};
    if (project.environmentVars && typeof project.environmentVars === 'object') {
      for (const [key, val] of Object.entries(project.environmentVars)) {
        if (!BLOCKED_ENV_KEYS.has(key.toUpperCase()) && typeof val === 'string') {
          sanitizedCustomEnv[key] = val;
        }
      }
    }

    const safePort = Number.isInteger(targetPort) && targetPort > 0 && targetPort <= 65535 ? targetPort : 3000;

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      PORT: safePort.toString(),
      CI: 'true',
      BROWSER: 'none',
      FORCE_COLOR: '1',
      NODE_OPTIONS: nodeOptions,
      CHOKIDAR_USEPOLLING: 'false',
      WATCHPACK_POLLING: 'false',
      ...sanitizedCustomEnv,
    };

    let command = project.command.trim();
    const hasPortArg = /(--port|-p)\s+\d+/i.test(command) || /\bPORT=/i.test(command);

    if (!hasPortArg && safePort) {
      if (/^npm\s+(run|start|test)/i.test(command)) {
        command = `${command} -- --port ${safePort}`;
      } else if (/^(yarn|pnpm|bun)\s+/i.test(command)) {
        command = `${command} --port ${safePort}`;
      } else if (/^(vite|npx\s+vite)/i.test(command)) {
        command = `${command} --port ${safePort}`;
      } else if (/^(next|npx\s+next)/i.test(command)) {
        command = `${command} -p ${safePort}`;
      }
    }

    return { command, env, allocatedCap };
  }

  public async startProject(project: Project, overridePort?: number): Promise<void> {
    this.projectConfigMap.set(project.id, project);
    const currentState = this.getState(project.id);
    if (currentState.status === 'running' || currentState.status === 'starting') {
      return;
    }

    const gitBranch = getGitBranch(project.path);
    this.clearStartupTimer(project.id);
    this.broadcastStateChange(project.id, { status: 'starting', gitBranch });

    const logSystem = (msg: string) => {
      this.broadcastLog(project.id, {
        id: Math.random().toString(36).substring(2),
        projectId: project.id,
        text: `[SYSTEM] ${msg}`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });
    };

    let targetPort = overridePort || project.port;
    if (!overridePort) {
      const portFree = await isPortAvailable(project.port);
      if (!portFree) {
        targetPort = await findNextUnusedPort(project.port + 1);
        logSystem(`Configured port ${project.port} is currently in use. Auto-allocated port ${targetPort}.`);
      }
    }

    const { command: effectiveCommand, env: effectiveEnv, allocatedCap } = this.getEffectiveCommandAndEnv(project, targetPort);

    logSystem(`Launching dev server in ${project.path} (Dynamic RAM cap: ${allocatedCap} MB)`);
    logSystem(`Command: ${effectiveCommand}`);

    try {
      // Sanitize shell chaining metacharacters (&, |, ;, `, $, \n, \r, <, >) to prevent shell injection (CRIT-001)
      const sanitizedCommand = effectiveCommand.replace(/[&|;`$\r\n<>]/g, '');

      const isWin = process.platform === 'win32';
      const shellBin = isWin ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
      const shellArgs = isWin ? ['/d', '/s', '/c', sanitizedCommand] : ['-c', sanitizedCommand];

      const child = spawn(shellBin, shellArgs, {
        cwd: project.path,
        env: effectiveEnv,
        windowsVerbatimArguments: isWin,
      });

      child.on('error', (err) => {
        this.clearStartupTimer(project.id);
        logSystem(`Process error: ${err.message}`);
        this.activeProcesses.delete(project.id);
        this.broadcastStateChange(project.id, { status: 'failed', error: err.message });
      });

      if (!child.pid) {
        this.broadcastStateChange(project.id, { status: 'failed', error: 'Failed to obtain PID' });
        return;
      }

      this.activeProcesses.set(project.id, child);
      const pid = child.pid;

      this.broadcastStateChange(project.id, {
        status: 'starting',
        pid,
        gitBranch,
        allocatedMemoryCapMb: allocatedCap,
      });

      // Active TCP Socket Polling: Poll targetPort every 500ms until server accepts connections
      let pollCount = 0;
      const pollTimer = setInterval(async () => {
        pollCount++;
        const state = this.getState(project.id);
        if (state.status !== 'starting') {
          clearInterval(pollTimer);
          return;
        }

        const isListening = !(await isPortAvailable(targetPort));
        if (isListening) {
          clearInterval(pollTimer);
          this.markRunning(project, pid, targetPort);
        } else if (pollCount > 240) {
          clearInterval(pollTimer);
        }
      }, 500);
      this.startupTimers.set(project.id, pollTimer as any);

      child.stdout?.on('data', (data: Buffer) => {
        const textStr = data.toString();
        const lines = textStr.split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            const cleanText = this.stripAnsi(line);
            this.broadcastLog(project.id, {
              id: Math.random().toString(36).substring(2),
              projectId: project.id,
              text: cleanText,
              type: 'stdout',
              timestamp: new Date().toLocaleTimeString(),
            });

            // Prompt auto-responder for CLI port questions
            if (/\? Port \d+ is already in use/i.test(cleanText) || /Would you like to use a different port\?/i.test(cleanText)) {
              logSystem('CLI port prompt detected. Auto-replying "y" to switch port...');
              try { child.stdin?.write('y\n'); } catch (e) {}
            }

            this.checkLogLineForPortAndState(project, pid, line);
          }
        });
      });

      child.stderr?.on('data', (data: Buffer) => {
        const textStr = data.toString();
        const lines = textStr.split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            const cleanText = this.stripAnsi(line);
            this.broadcastLog(project.id, {
              id: Math.random().toString(36).substring(2),
              projectId: project.id,
              text: cleanText,
              type: 'stderr',
              timestamp: new Date().toLocaleTimeString(),
            });

            this.checkLogLineForPortAndState(project, pid, line);
          }
        });
      });



      child.on('exit', (code, signal) => {
        this.clearStartupTimer(project.id);
        logSystem(`Process exited with code ${code} (signal: ${signal || 'none'})`);
        this.activeProcesses.delete(project.id);

        if (code !== 0 && code !== null && signal !== 'SIGKILL') {
          this.broadcastStateChange(project.id, { status: 'failed', error: `Exited with code ${code}` });
        } else {
          this.broadcastStateChange(project.id, { status: 'idle' });
        }
      });
    } catch (err: any) {
      this.clearStartupTimer(project.id);
      logSystem(`Exception launching process: ${err.message}`);
      this.broadcastStateChange(project.id, { status: 'failed', error: err.message });
    }
  }

  public stopProject(projectId: string): Promise<void> {
    return new Promise((resolve) => {
      this.clearStartupTimer(projectId);
      const state = this.getState(projectId);
      const actualPort = state.actualPort;
      clearPortPidCache(actualPort);

      const child = this.activeProcesses.get(projectId);
      if (!child || !child.pid) {
        this.broadcastStateChange(projectId, { status: 'idle' });
        return resolve();
      }

      this.broadcastStateChange(projectId, { status: 'stopping' });

      // Clean tree kill on Windows
      kill(child.pid, 'SIGKILL', (err) => {
        if (err) {
          console.error(`Failed to tree-kill pid ${child.pid}:`, err);
        }
        this.activeProcesses.delete(projectId);
        clearPortPidCache(actualPort);
        setTimeout(() => {
          clearPortPidCache(actualPort);
          this.broadcastStateChange(projectId, { status: 'idle' });
          resolve();
        }, 250);
      });
    });
  }

  public async restartProject(project: Project): Promise<void> {
    await this.stopProject(project.id);
    setTimeout(() => {
      this.startProject(project);
    }, 500);
  }

  public async stopAll(): Promise<void> {
    const ids = Array.from(this.activeProcesses.keys());
    await Promise.all(ids.map((id) => this.stopProject(id)));
  }

  public clearLogs(projectId: string): void {
    this.logs.set(projectId, []);
    const windows = this.windowGetter();
    windows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('project-logs-cleared', { projectId });
      }
    });
  }

  public cleanupProject(projectId: string): void {
    this.clearStartupTimer(projectId);
    this.activeProcesses.delete(projectId);
    this.states.delete(projectId);
    this.logs.delete(projectId);
    this.pendingLogsQueue.delete(projectId);
    this.projectConfigMap.delete(projectId);
  }
}
