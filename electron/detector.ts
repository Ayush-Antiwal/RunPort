import fs from 'fs';
import path from 'path';
import net from 'net';
import { execFile } from 'child_process';
import kill from 'tree-kill';
import util from 'util';
import { FrameworkType } from './types';

export interface DetectionResult {
  name: string;
  framework: FrameworkType;
  command: string;
  port: number;
}

export function getGitBranch(projectPath: string): string | undefined {
  try {
    const headPath = path.join(projectPath, '.git', 'HEAD');
    if (fs.existsSync(headPath)) {
      const content = fs.readFileSync(headPath, 'utf-8').trim();
      if (content.startsWith('ref: refs/heads/')) {
        return content.replace('ref: refs/heads/', '').trim();
      }
      return content.substring(0, 7); // short commit sha if detached
    }
  } catch (e) {
    // Ignore git read error
  }
  return undefined;
}

const execFilePromise = util.promisify(execFile);

export async function getGitBranches(projectPath: string): Promise<string[]> {
  try {
    const { stdout } = await execFilePromise('git', ['branch', '--no-color', '--format=%(refname:short)'], { cwd: projectPath });
    return stdout.split('\n').map(b => b.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function switchGitBranch(projectPath: string, branchName: string): Promise<{ success: boolean; error?: string }> {
  // Validate branch name against safe git ref naming standard to prevent argument or command injection
  if (!branchName || typeof branchName !== 'string' || !/^[\w./-]+$/.test(branchName) || branchName.startsWith('-')) {
    return { success: false, error: 'Invalid branch name format' };
  }
  try {
    await execFilePromise('git', ['switch', branchName], { cwd: projectPath });
    return { success: true };
  } catch (e: unknown) {
    console.error('Failed to switch branch:', e);
    const errObj = e as { stderr?: string; message?: string };
    const errorMsg = errObj?.stderr || errObj?.message || 'Unknown git error';
    return { success: false, error: errorMsg };
  }
}

export async function isPortAvailable(port: number): Promise<boolean> {
  if (!port || isNaN(port) || port < 1 || port > 65535) return true;
  const pid = await getProcessUsingPort(port);
  if (pid) return false;
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

const portPidCache = new Map<number, { pid: number | null; timestamp: number }>();
const CACHE_TTL_MS = 500;

export function getProcessUsingPort(port: number): Promise<number | null> {
  if (!port || isNaN(port) || port < 1 || port > 65535) return Promise.resolve(null);
  const now = Date.now();
  const cached = portPidCache.get(port);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.pid);
  }

  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('netstat', ['-ano'], (err, stdout) => {
        if (err || !stdout.trim()) {
          portPidCache.set(port, { pid: null, timestamp: Date.now() });
          return resolve(null);
        }
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.includes('LISTENING')) continue;
          const parts = trimmed.split(/\s+/);
          const localAddr = parts[1] || '';
          if (localAddr.endsWith(`:${port}`)) {
            const pidStr = parts[parts.length - 1];
            const pid = parseInt(pidStr, 10);
            if (!isNaN(pid) && pid > 0) {
              portPidCache.set(port, { pid, timestamp: Date.now() });
              return resolve(pid);
            }
          }
        }
        portPidCache.set(port, { pid: null, timestamp: Date.now() });
        resolve(null);
      });
    } else {
      execFile('lsof', ['-i', `:${port}`, '-t'], (err, stdout) => {
        if (err || !stdout.trim()) {
          portPidCache.set(port, { pid: null, timestamp: Date.now() });
          return resolve(null);
        }
        const pid = parseInt(stdout.trim().split('\n')[0], 10);
        const result = isNaN(pid) ? null : pid;
        portPidCache.set(port, { pid: result, timestamp: Date.now() });
        resolve(result);
      });
    }
  });
}

export function clearPortPidCache(port?: number) {
  if (port) {
    portPidCache.delete(port);
  } else {
    portPidCache.clear();
  }
}

export function killProcessOnPort(port: number): Promise<boolean> {
  // Enforce valid port range and guard privileged system ports
  if (!port || isNaN(port) || port < 1024 || port > 65535) {
    console.warn(`Blocked attempt to kill process on system or invalid port: ${port}`);
    return Promise.resolve(false);
  }

  return new Promise(async (resolve) => {
    clearPortPidCache(port);
    const pid = await getProcessUsingPort(port);
    if (!pid || pid <= 0) return resolve(true);
    kill(pid, 'SIGKILL', (err) => {
      if (err) console.error(`Failed to kill process on port ${port} (PID ${pid}):`, err);
      clearPortPidCache(port);
      setTimeout(() => {
        clearPortPidCache(port);
        resolve(!err);
      }, 300);
    });
  });
}

export async function findNextUnusedPort(startPort: number): Promise<number> {
  let p = startPort;
  while (p < 65535) {
    const free = await isPortAvailable(p);
    if (free) return p;
    p++;
  }
  return startPort;
}

export async function autoDetectProject(projectPath: string): Promise<DetectionResult> {
  const folderName = path.basename(projectPath);
  let framework: FrameworkType = 'generic';
  let command = 'npm run dev';
  let port = 3000;
  let customPortFound = false;

  // Check for .env file port override
  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m);
      if (portMatch && portMatch[1]) {
        port = parseInt(portMatch[1], 10);
        customPortFound = true;
      }
    } catch (e) {
      console.error('Error parsing .env:', e);
    }
  }

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const scripts = pkg.scripts || {};

      // Detect package manager lock files
      let pm = 'npm';
      if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) pm = 'pnpm';
      else if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) pm = 'yarn';
      else if (fs.existsSync(path.join(projectPath, 'bun.lockb')) || fs.existsSync(path.join(projectPath, 'bun.lock'))) pm = 'bun';

      // Framework inspection
      if (deps['next']) {
        framework = 'nextjs';
        if (!customPortFound) port = 3000;
        command = scripts.dev ? `${pm} run dev` : `${pm} start`;
      } else if (deps['vite']) {
        framework = 'vite';
        if (!customPortFound) port = 5173;
        command = scripts.dev ? `${pm} run dev` : `${pm} start`;
      } else if (deps['@angular/core']) {
        framework = 'angular';
        if (!customPortFound) port = 4200;
        command = scripts.start ? `${pm} start` : `${pm} run serve`;
      } else if (deps['nuxt']) {
        framework = 'nuxt';
        if (!customPortFound) port = 3000;
        command = scripts.dev ? `${pm} run dev` : `${pm} start`;
      } else if (deps['vue']) {
        framework = 'vue';
        if (!customPortFound) port = 5173;
        command = scripts.dev ? `${pm} run dev` : `${pm} run serve`;
      } else if (deps['@nestjs/core']) {
        framework = 'nestjs';
        if (!customPortFound) port = 3000;
        command = scripts['start:dev'] ? `${pm} run start:dev` : `${pm} start`;
      } else if (deps['express']) {
        framework = 'express';
        if (!customPortFound) port = 5000;
        command = scripts.dev ? `${pm} run dev` : scripts.start ? `${pm} start` : 'node index.js';
      } else if (deps['react']) {
        framework = 'react';
        if (!customPortFound) port = 3000;
        command = scripts.start ? `${pm} start` : `${pm} run dev`;
      } else {
        if (scripts.dev) command = `${pm} run dev`;
        else if (scripts.start) command = `${pm} start`;
      }

      // Check script string for explicit --port or -p override
      const scriptBody = scripts.dev || scripts.start || '';
      const scriptPortMatch = scriptBody.match(/(--port|-p)\s+(\d+)/i);
      if (scriptPortMatch && scriptPortMatch[2]) {
        port = parseInt(scriptPortMatch[2], 10);
        customPortFound = true;
      }

      // Ensure suggested port is unused
      const suggestedPort = await findNextUnusedPort(port);

      return {
        name: pkg.name || folderName,
        framework,
        command,
        port: suggestedPort,
      };
    } catch (e) {
      console.error('Error parsing package.json:', e);
    }
  }

  // Check Rust
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    const suggestedPort = await findNextUnusedPort(8080);
    return {
      name: folderName,
      framework: 'go',
      command: 'cargo run',
      port: suggestedPort,
    };
  }

  // Check Python
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
    const suggestedPort = await findNextUnusedPort(8000);
    return {
      name: folderName,
      framework: 'python',
      command: 'python main.py',
      port: suggestedPort,
    };
  }

  const suggestedPort = await findNextUnusedPort(port);
  return {
    name: folderName,
    framework: 'generic',
    command: 'npm run dev',
    port: suggestedPort,
  };
}

