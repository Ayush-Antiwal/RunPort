import React, { useEffect, useState } from 'react';
import { Play, Square, ExternalLink, GitBranch, Folder, AlertCircle } from 'lucide-react';
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
  const [branches, setBranches] = useState<string[]>([]);

  // Port Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [suggestedPort, setSuggestedPort] = useState<number>(project.port + 1);

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
    <div className="p-4 bg-[#0f0f13] min-w-[320px] flex flex-col gap-3.5 select-none">
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

      {/* Main Row: Left Details Column + Right Actions Column */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Left Column: Title, Badges, Folder Path, Git Branch */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {/* Row 1: Name + Framework Badge + Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={isRunning ? 'dot-running' : isStarting || isStopping ? 'dot-starting' : isFailed ? 'dot-failed' : 'dot-idle'}
              title={isRunning ? 'Running' : isStarting ? 'Starting...' : isStopping ? 'Stopping...' : isFailed ? 'Failed' : 'Idle'}
            />
            <h2 className="text-[1.15rem] sm:text-[1.25rem] font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-none">{project.name}</h2>

            <Badge variant="default" className="text-[0.68rem]">{project.framework}</Badge>
            
            {isRunning && (
              <span className="text-[0.72rem] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {uptimeStr || '0s'}
              </span>
            )}
          </div>

          {/* Failure banner */}
          {isFailed && state.error && (
            <div className="bg-red-500/10 border border-red-500/25 px-3 py-1.5 text-[0.75rem] text-red-300 font-mono rounded-[var(--radius)] flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="truncate">{state.error}</span>
            </div>
          )}

          {/* Row 2: Directory Path & Inline Git Branch Selector */}
          <div className="flex items-center gap-2.5 text-[0.75rem] text-[#64748b] font-mono flex-wrap">
            <div
              onClick={() => window.electronAPI.openInExplorer(project.path)}
              title="Click to reveal in File Explorer"
              className="flex items-center gap-1.5 cursor-pointer hover:text-amber-300 transition-colors group min-w-0"
            >
              <Folder size={13} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[180px] sm:max-w-[280px] md:max-w-sm text-[#94a3b8] group-hover:text-white transition-colors">{project.path}</span>
            </div>

            <div className="relative inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-[0.75rem] shrink-0 group cursor-pointer">
              <GitBranch size={12} className="shrink-0 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span>{state.gitBranch || 'main'}</span>
              <select
                value={state.gitBranch || 'main'}
                onChange={async (e) => {
                  const selected = e.target.value;
                  const res = await window.electronAPI.switchGitBranch(project.id, project.path, selected);
                  if (!res.success) {
                    alert(`Failed to switch to branch ${selected}:\n\n${res.error || 'Unknown error'}`);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Click to switch Git branch"
              >
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <option key={b} value={b} className="bg-[#181824] text-white">
                      {b}
                    </option>
                  ))
                ) : (
                  <option value={state.gitBranch || 'main'} className="bg-[#181824] text-white">
                    {state.gitBranch || 'main'}
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Actions [Start Server / Stop] [Open ↗] */}
        <div className="flex items-center gap-2 shrink-0 sm:my-auto self-start sm:self-center">
          {!isRunning ? (
            <Button
              onClick={handleStartClick}
              disabled={isStarting}
              size="md"
              variant="primary"
              className="h-8 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Play size={12} fill="currentColor" /> {isStarting ? 'Starting...' : 'Start Server'}
            </Button>
          ) : (
            <Button
              onClick={() => onStop(project.id)}
              disabled={isStopping}
              title="Stop Server"
              className="h-8 px-4 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Square size={10} fill="currentColor" /> Stop
            </Button>
          )}

          {isRunning && (
            <Button
              onClick={() => window.electronAPI.openInBrowser(projectUrl)}
              size="md"
              className="h-8 px-3 text-xs flex items-center gap-1.5 font-medium text-blue-400 hover:text-blue-300 bg-[#161622] hover:bg-[#202030] border border-[#2a2a3c]"
              title={`Open ${projectUrl} in Browser`}
            >
              <span>Open</span>
              <ExternalLink size={11} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
