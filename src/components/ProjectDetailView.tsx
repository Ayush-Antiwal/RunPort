import React, { useEffect, useState } from 'react';
import { Play, Square, ExternalLink, GitBranch, XCircle, Folder, Code } from 'lucide-react';
import { Project, ProjectRuntimeState } from '../../electron/types';
import { PortConflictModal } from './PortConflictModal';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface ProjectDetailViewProps {
  project: Project;
  state: ProjectRuntimeState;
  onStart: (project: Project, overridePort?: number) => void;
  onStop: (id: string) => void;
  onRestart: (project: Project) => void;
  onDelete: (id: string) => void;
  onSaveProject: (project: Project) => void;
}

// Property cell — used in the property grid
const PropCell = ({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) => (
  <div>
    <span className="block text-[0.62rem] font-bold uppercase tracking-wider text-[--text-dim] mb-0.5">{label}</span>
    <span className={cn('text-[0.8rem] text-white', mono && 'font-mono')}>{children}</span>
  </div>
);

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project, state, onStart, onStop, onRestart, onDelete, onSaveProject,
}) => {
  const isRunning = state.status === 'running';
  const isStarting = state.status === 'starting';
  const isStopping = state.status === 'stopping';
  const isFailed = state.status === 'failed';

  const [uptimeStr, setUptimeStr] = useState('');
  const [occupyingPid, setOccupyingPid] = useState<number | null>(null);
  const [isFreeingPort, setIsFreeingPort] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);

  // Port Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [suggestedPort, setSuggestedPort] = useState<number>(project.port + 1);

  const checkOccupyingPid = async () => {
    if (!isRunning && !isStarting && !isStopping) {
      const pid = await window.electronAPI.getOccupyingPid(project.port);
      if (pid && state.pid && pid === state.pid) {
        setOccupyingPid(null);
      } else {
        setOccupyingPid(pid);
      }
    } else {
      setOccupyingPid(null);
    }
  };

  useEffect(() => {
    checkOccupyingPid();
  }, [project.id, project.port, isRunning, isStarting, isStopping, state.pid]);

  useEffect(() => {
    let active = true;
    const fetchBranches = async () => {
      try {
        const list = await window.electronAPI.getGitBranches(project.path);
        if (active) {
          const current = state.gitBranch || 'main';
          const unifiedList = list.includes(current) ? list : [current, ...list];
          setBranches(unifiedList);
        }
      } catch (err) {
        if (active) setBranches([state.gitBranch || 'main']);
      }
    };
    fetchBranches();
    return () => { active = false; };
  }, [project.id, project.path, state.gitBranch]);

  const handleFreePort = async () => {
    setIsFreeingPort(true);
    await window.electronAPI.freePort(project.port);
    await checkOccupyingPid();
    setIsFreeingPort(false);
  };

  const handleStartClick = async () => {
    try {
      const isFree = await window.electronAPI.checkPortAvailable(project.port);
      if (isFree) {
        onStart(project);
      } else {
        const pid = await window.electronAPI.getOccupyingPid(project.port);
        const nextPort = await window.electronAPI.findNextPort(project.port + 1);
        setOccupyingPid(pid);
        setSuggestedPort(nextPort || project.port + 1);
        setIsConflictModalOpen(true);
      }
    } catch (err) {
      console.warn('Port availability check failed, launching directly:', err);
      onStart(project);
    }
  };

  useEffect(() => {
    if (!isRunning || !state.startedAt) { setUptimeStr(''); return; }
    const updateUptime = () => {
      const startTime = typeof state.startedAt === 'number'
        ? state.startedAt
        : new Date(state.startedAt || Date.now()).getTime();
      const sec = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(sec / 60), s = sec % 60, h = Math.floor(m / 60);
      setUptimeStr(h > 0 ? `${h}h ${m % 60}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    updateUptime();
    const t = setInterval(updateUptime, 1000);
    return () => clearInterval(t);
  }, [isRunning, state.startedAt]);

  const activePort = (isRunning && state.actualPort) ? state.actualPort : project.port;
  const projectUrl = `http://localhost:${activePort}`;

  // Status badge
  const statusBadge = () => {
    if (isRunning) {
      return (
        <span className="flex items-center gap-1.5 font-mono text-[0.8rem] text-emerald-400 font-semibold">
          <span className="dot-running" /> {uptimeStr || '0s'}
        </span>
      );
    }
    if (isStarting) {
      return (
        <span className="flex items-center gap-1.5 font-mono text-[0.8rem] text-amber-400 font-semibold animate-pulse">
          <span className="dot-starting" /> Starting...
        </span>
      );
    }
    if (isStopping) {
      return (
        <span className="flex items-center gap-1.5 font-mono text-[0.8rem] text-amber-400 font-semibold animate-pulse">
          <span className="dot-starting" /> Stopping...
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="flex items-center gap-1.5 font-mono text-[0.8rem] text-red-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 font-mono text-[0.8rem] text-zinc-400 font-semibold">
        <span className="dot-idle" /> Idle
      </span>
    );
  };

  return (
    <div className="px-5 py-4 bg-[#121214] border-b border-[#26262b] flex flex-col gap-3" style={{ userSelect: 'none' }}>
      <PortConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        port={project.port}
        suggestedPort={suggestedPort}
        occupyingPid={occupyingPid}
        onUseSuggestedPort={(portOverride) => {
          onStart(project, portOverride);
        }}
        onFreeAndUseOriginalPort={async (portToFree) => {
          await window.electronAPI.freePort(portToFree);
          onStart(project, portToFree);
        }}
      />

      {/* Port in use warning banner */}
      {!isRunning && occupyingPid && (
        <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-[0.75rem] text-amber-300 font-mono rounded-[var(--radius)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-amber-400 shrink-0" />
            <span>Port {project.port} is currently in use by PID {occupyingPid}.</span>
          </div>
          <Button size="sm" variant="destructive" onClick={handleFreePort} disabled={isFreeingPort} className="h-6 text-[0.7rem] px-2.5">
            {isFreeingPort ? 'Freeing...' : `Free Port ${project.port}`}
          </Button>
        </div>
      )}

      {/* Header row: name + badges + actions on top right */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={isRunning ? 'dot-running' : isStarting || isStopping ? 'dot-starting' : 'dot-idle'}
              title={isRunning ? 'Running' : isStarting ? 'Starting...' : isStopping ? 'Stopping...' : isFailed ? 'Failed' : 'Idle'}
            />
            <h2 className="text-[1.2rem] font-bold text-white tracking-tight">{project.name}</h2>
            <Badge>{project.framework}</Badge>
            {state.gitBranch && (
              <Badge variant="primary" className="normal-case font-mono">
                <GitBranch size={10} /> {state.gitBranch}
              </Badge>
            )}
          </div>
          {/* Sub-row: Directory Path */}
          <div className="flex items-center gap-3 text-[0.72rem] text-[#64748b] font-mono mt-0.5">
            <div
              onClick={() => window.electronAPI.openInExplorer(project.path)}
              title="Click to reveal in File Explorer"
              className="flex items-center gap-1.5 cursor-pointer hover:text-amber-300 transition-colors group"
            >
              <Folder size={13} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-md text-[#94a3b8] group-hover:text-white transition-colors font-mono">{project.path}</span>
            </div>
          </div>
        </div>

        {/* Top Header Actions (Start / Stop, Open in VS Code, Open ↗) */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => window.electronAPI.openInIDE(project.path)}
            size="md"
            variant="default"
            className="h-8 px-3 text-xs flex items-center gap-1.5"
            title="Open project in VS Code"
          >
            <Code size={12} />
            <span>VS Code</span>
          </Button>

          {!isRunning ? (
            <Button
              onClick={handleStartClick}
              disabled={isStarting}
              size="md"
              variant="primary"
              className="h-8 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <Play size={12} fill="currentColor" /> {isStarting ? 'Starting...' : 'Start Server'}
            </Button>
          ) : (
            <Button
              onClick={() => onStop(project.id)}
              disabled={isStopping}
              title="Stop Server"
              className="h-8 px-4 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-1.5"
            >
              <Square size={10} fill="currentColor" /> Stop
            </Button>
          )}
        </div>
      </div>

      {/* Failure banner */}
      {isFailed && state.error && (
        <div className="bg-red-500/10 border border-red-500/25 px-3 py-1.5 text-[0.75rem] text-red-300 font-mono rounded-[var(--radius)]">
          {state.error}
        </div>
      )}

      {/* Property Grid (3 Clean Core Columns) */}
      <div className="bg-[#16161a] border border-[#272730] px-4 py-3 rounded-lg shadow-sm">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 items-center">
          {/* Status Column */}
          <PropCell label="Status">{statusBadge()}</PropCell>

          {/* Host/URL Column */}
          <PropCell label="Host" mono>
            {isRunning ? (
              <div className="flex items-center gap-2">
                <a
                  href={projectUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI.openInBrowser(projectUrl);
                  }}
                  className="text-blue-400 hover:text-blue-300 underline hover:no-underline flex items-center gap-1.5 cursor-pointer font-semibold"
                >
                  {projectUrl}
                  <ExternalLink size={10} className="shrink-0" />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(projectUrl);
                  }}
                  title="Copy URL"
                  className="p-1 hover:bg-[#272732] rounded text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            ) : (
              <span className="text-zinc-500 font-mono text-[0.8rem]">{project.port}</span>
            )}
          </PropCell>

          {/* Git Branch Column */}
          <PropCell label="Git Branch" mono>
            <div className="relative inline-block">
              {branches.length > 0 ? (
                <select
                  value={state.gitBranch || 'main'}
                  onChange={async (e) => {
                    const selected = e.target.value;
                    const res = await window.electronAPI.switchGitBranch(project.id, project.path, selected);
                    if (!res.success) {
                      alert(`Failed to switch to branch ${selected}:\n\n${res.error || 'Unknown error'}`);
                    }
                  }}
                  className="bg-[#17171c] border border-[#272732] text-[0.8rem] rounded px-1.5 py-0.5 font-semibold text-blue-400 focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-blue-400">
                  {state.gitBranch || 'main'}
                </span>
              )}
            </div>
          </PropCell>
        </div>
      </div>
    </div>
  );
};
