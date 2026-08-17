import React, { useState } from 'react';
import { Plus, Search, Play, Square, Monitor, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, ProjectRuntimeState } from '../../electron/types';
import { Button } from './ui/button';

interface SidebarProps {
  projects: Project[];
  states: Record<string, ProjectRuntimeState>;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenAddModal: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  onToggleWidget: () => void;
  onOpenSettings: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

const FILTERS = ['all', 'running', 'idle'] as const;
type Filter = typeof FILTERS[number];

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  states,
  selectedProjectId,
  onSelectProject,
  onOpenAddModal,
  onStartAll,
  onStopAll,
  onToggleWidget,
  onOpenSettings,
  isCompact = false,
  onToggleCompact,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const allCount = projects.length;
  const runningCount = projects.filter((p) => {
    const st = states[p.id]?.status;
    return st === 'running' || st === 'starting';
  }).length;
  const idleCount = allCount - runningCount;

  const counts: Record<Filter, number> = { all: allCount, running: runningCount, idle: idleCount };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase());
    const st = states[p.id]?.status || 'idle';
    const matchesFilter =
      filter === 'all' ||
      (filter === 'running' && (st === 'running' || st === 'starting')) ||
      (filter === 'idle' && (st === 'idle' || st === 'failed'));
    return matchesSearch && matchesFilter;
  });

  return (
    <aside
      className="h-full w-full flex flex-col bg-[#0f0f13] border-r border-[#22222a] select-none shrink-0"
    >
      {/* Header bar */}
      {isCompact ? (
        <div className="h-9 px-1.5 flex flex-col items-center justify-center border-b border-[#22222a] bg-[#0c0c0f] shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Expand Sidebar"
            onClick={onToggleCompact}
            className="w-7 h-7 text-[#94a3b8] hover:text-white"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      ) : (
        <div className="h-9 px-2 flex items-center justify-between border-b border-[#22222a] bg-[#0c0c0f] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[#fafafa] pl-1 select-none">RunPort</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              title="Desktop Widget"
              onClick={onToggleWidget}
              className="w-7 h-7 text-[#94a3b8] hover:text-white"
            >
              <Monitor size={12} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Settings"
              onClick={onOpenSettings}
              className="w-7 h-7 text-[#94a3b8] hover:text-white"
            >
              <SettingsIcon size={12} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Collapse Sidebar"
              onClick={onToggleCompact}
              className="w-7 h-7 text-[#94a3b8] hover:text-white"
            >
              <ChevronLeft size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter Header Section - Hide in Compact Mode */}
      {!isCompact && (
        <div className="p-2.5 flex flex-col gap-2 border-b border-[#1a1a22]">
          <div className="relative w-full">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none z-10"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-[#17171d] border border-[#272732] focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 rounded-[var(--radius)] pl-8 pr-2.5 py-1 text-xs text-white placeholder-[#475569] outline-none transition-all"
            />
          </div>

          <div className="flex gap-1">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 text-[0.68rem] font-medium rounded transition-all cursor-pointer text-center ${
                    active
                      ? 'bg-[#22222c] text-white border border-[#333342] font-semibold'
                      : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#16161c] border border-transparent'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-70 font-mono">({counts[f]})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {filteredProjects.length === 0 ? (
          <div className="py-8 px-2 text-center text-xs text-[#64748b]">
            {!isCompact ? 'No projects found' : '—'}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const state = states[project.id] || { status: 'idle' };
            const isSelected = project.id === selectedProjectId;
            const isRunning = state.status === 'running';
            const isStarting = state.status === 'starting';
            const activePort = (isRunning && state.actualPort) ? state.actualPort : project.port;

            if (isCompact) {
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  title={project.name}
                  className={`flex flex-col items-center justify-center p-2 rounded-[var(--radius)] cursor-pointer transition-all duration-150 relative group ${
                    isSelected
                      ? 'bg-[#1e1e26] border border-[#30303d] text-white shadow-sm'
                      : 'bg-transparent border border-transparent text-[#e4e4e7] hover:bg-[#16161e] hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${isRunning ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  )}

                  <div className="relative flex items-center justify-center h-5 w-5">
                    <span className={isRunning ? 'dot-running' : isStarting ? 'dot-starting' : 'dot-idle'} />
                  </div>
                  <span className="text-[0.58rem] font-mono text-zinc-500 mt-1">
                    {state.isSleeping ? 'slp' : String(activePort).slice(-4)}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-[var(--radius)] cursor-pointer transition-all duration-150 relative group ${
                  isSelected
                    ? 'bg-[#1e1e26] border border-[#30303d] text-white shadow-sm'
                    : 'bg-transparent border border-transparent text-[#e4e4e7] hover:bg-[#16161e] hover:text-white'
                }`}
              >
                {/* Active strip on left side */}
                {isSelected && (
                  <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${isRunning ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                )}

                <span className={`text-xs truncate font-medium ${isSelected ? 'text-white pl-1' : ''}`}>
                  {project.name}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={isRunning ? 'dot-running' : isStarting ? 'dot-starting' : 'dot-idle'} />
                  <span className="font-mono text-[0.65rem] text-[#64748b]">
                    {state.isSleeping ? 'asleep' : activePort}
                  </span>

                  {isRunning && state.memoryMb !== undefined && (
                    <span
                      title={`RAM: ${state.memoryMb} MB`}
                      className="text-[0.62rem] font-mono px-1 py-0.5 rounded font-medium bg-[#181822] text-[#94a3b8] border border-[#282836]"
                    >
                      {state.memoryMb}M
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pinned Add Project Button */}
      {isCompact ? (
        <div className="p-2 border-t border-[#22222a] bg-[#0c0c0f] flex justify-center">
          <Button
            onClick={onOpenAddModal}
            variant="primary"
            size="icon"
            title="Add Project"
            className="w-8 h-8 rounded-full flex items-center justify-center animate-fade-in"
          >
            <Plus size={14} />
          </Button>
        </div>
      ) : (
        <div className="p-2.5 border-t border-[#22222a] bg-[#0c0c0f]">
          <Button
            onClick={onOpenAddModal}
            variant="primary"
            className="w-full justify-center text-xs h-8 shadow-sm animate-fade-in"
          >
            <Plus size={14} /> Add Project
          </Button>
        </div>
      )}
    </aside>
  );
};

