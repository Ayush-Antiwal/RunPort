import React, { useEffect, useState } from 'react';
import { Play, Square, ExternalLink, GitBranch, Folder } from 'lucide-react';
import { Project, ProjectRuntimeState } from '../../electron/types';
import { PortConflictModal } from './PortConflictModal';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useSnackbar } from './ui/snackbar';

interface ProjectDetailViewProps {
  project: Project;
  state: ProjectRuntimeState;
  onStart: (project: Project, overridePort?: number) => void;
  onStop: (id: string) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project, state, onStart, onStop,
}) => {
  const { toast } = useSnackbar();
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

  // Trigger floating snackbar toast when auto-stopped or failed state occurs
  useEffect(() => {
    if (!isRunning && state.autoStoppedReason) {
      const reasonText = state.autoStoppedReason === 'idle' ? 'Inactivity timeout' : 'System sleep mode';
      toast({
        type: 'warning',
        title: `Server auto-stopped (${reasonText})`,
        duration: 10000,
        action: {
          label: 'Wake Up Server',
          onClick: () => {
            handleStartClick();
          },
        },
      });
    }

    if (isFailed && state.error) {
      toast({
        type: 'error',
        title: `Server Error`,
        description: state.error,
        duration: 10000,
      });
    }
  }, [project.id, isRunning, isFailed, state.autoStoppedReason, state.error]);

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
              <span className="text-[0.72rem] font-mono text-emerald-400 font-semibold bg-[#162520] border border-emerald-500/30 px-2 py-0.5 rounded">
                {uptimeStr || '0s'}
              </span>
            )}
          </div>

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
