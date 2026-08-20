import React from 'react';
import { Play, Square, ExternalLink, GripHorizontal, X, Minus, LayoutDashboard } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { cn } from '@/lib/utils';
import { useProjectsAndStates } from '../hooks/useProjectsAndStates';

export const DesktopWidgetView: React.FC = () => {
  const { projects, states } = useProjectsAndStates();

  const runningCount = Object.values(states).filter((s) => s.status === 'running').length;

  return (
    <div className="w-screen h-screen flex flex-col p-2.5 bg-[#09090b] border border-[#272730] overflow-hidden select-none box-border shadow-2xl rounded-xl">
      {/* Top Drag Header bar */}
      <div className="drag-header flex items-center justify-between px-2.5 py-1 border-b border-[#272730] bg-[#0c0c0f] rounded-t-lg cursor-grab mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal size={13} className="text-[#52525b] shrink-0" />
          <span className="text-[0.68rem] font-bold text-[#fafafa] tracking-widest shrink-0">
            RUNPORT
          </span>
          <Badge
            variant={runningCount > 0 ? 'running' : 'default'}
            className="text-[0.6rem] px-1.5 py-0.5 font-mono normal-case whitespace-nowrap shrink-0 inline-flex items-center"
          >
            {runningCount} Active
          </Badge>
        </div>

        {/* Window Action Controls */}
        <div className="flex items-center gap-1 no-drag shrink-0">
          <button
            onClick={() => window.electronAPI.toggleWidgetWindow()}
            title="Hide Mini Widget"
            className="h-5 w-5 flex items-center justify-center text-[#52525b] hover:text-[#fafafa] hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          >
            <Minus size={11} />
          </button>
          <button
            onClick={() => window.electronAPI.toggleWidgetWindow()}
            title="Close Widget"
            className="h-5 w-5 flex items-center justify-center text-[#52525b] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Project Server list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 no-drag pr-0.5">
        {projects.length === 0 ? (
          <div className="text-[0.7rem] text-[#52525b] text-center my-auto py-6 font-medium italic">
            No registered servers
          </div>
        ) : (
          projects.map((project) => {
            const state = states[project.id] ?? { status: 'idle' };
            const isRunning = state.status === 'running';
            const isStarting = state.status === 'starting';
            const activePort = (isRunning && state.actualPort) ? state.actualPort : project.port;

            return (
              <div
                key={project.id}
                className="bg-[#121214] hover:bg-[#18181b] border border-[#272730] px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all duration-150 group"
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <span className="font-semibold text-[#fafafa] truncate text-[0.75rem] max-w-[110px] tracking-tight">
                    {project.name}
                  </span>
                  
                  {/* Clickable Port preview badge [● 5173 ↗] */}
                  <div
                    onClick={() => {
                      if (isRunning) {
                        window.electronAPI.openInBrowser(`http://localhost:${activePort}`);
                      }
                    }}
                    title={isRunning ? "Click to open in browser preview" : `Configured port: ${activePort}`}
                    className={cn(
                      "font-mono text-[0.62rem] px-1.5 py-0.5 rounded border flex items-center gap-1.5 shrink-0 transition-colors duration-150 select-none",
                      isRunning
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 hover:text-emerald-300"
                        : isStarting
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                        : "bg-[#1c1c24] border-[#272730] text-zinc-500"
                    )}
                  >
                    <span className={cn(
                      'w-1 h-1 rounded-full shrink-0',
                      isRunning ? 'bg-emerald-400' : isStarting ? 'bg-amber-400' : 'bg-zinc-600'
                    )} />
                    <span>{activePort}</span>
                    {isRunning && <ExternalLink size={8} className="shrink-0 opacity-80" />}
                  </div>
                </div>

                {/* Fixed-width Icon-only Controls */}
                <div className="flex items-center justify-center w-6 shrink-0">
                  {!isRunning ? (
                    <button
                      disabled={isStarting}
                      onClick={() => window.electronAPI.startProject(project)}
                      title="Start Server"
                      className="h-6 w-6 flex items-center justify-center bg-white hover:bg-zinc-200 text-black rounded border border-zinc-300 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Play size={10} fill="currentColor" className="ml-0.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => window.electronAPI.stopProject(project.id)}
                      title="Stop Server"
                      className="h-6 w-6 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded border border-red-500/25 transition-all cursor-pointer animate-fade-in"
                    >
                      <Square size={9} fill="currentColor" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Quick Launch Footer */}
      <div className="no-drag mt-2 pt-2 border-t border-[#272730] flex items-center justify-between shrink-0 px-1 bg-[#0c0c0f] -mx-2.5 -mb-2.5 p-2 rounded-b-xl">
        <span className="text-[0.62rem] text-[#52525b] font-mono tracking-tight font-medium">
          {projects.length} {projects.length === 1 ? 'Project' : 'Projects'} (Live)
        </span>
        <button
          onClick={() => window.electronAPI.openDashboard()}
          className="text-[0.62rem] font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-0.5 rounded transition-all cursor-pointer shadow-sm"
        >
          <LayoutDashboard size={10} className="inline mr-1" />
          <span>Dashboard ↗</span>
        </button>
      </div>
    </div>
  );
};
