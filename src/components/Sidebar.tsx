import React, { useState } from "react";
import {
  Plus,
  Search,
  Play,
  Square,
  Monitor,
  Settings as SettingsIcon,
  PanelLeft,
} from "lucide-react";
import { Project, ProjectRuntimeState } from "../../electron/types";
import { Button } from "./ui/button";

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

const FILTERS = ["all", "running", "idle"] as const;
type Filter = (typeof FILTERS)[number];

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const allCount = projects.length;
  const runningCount = projects.filter((p) => {
    const st = states[p.id]?.status;
    return st === "running" || st === "starting";
  }).length;
  const idleCount = allCount - runningCount;

  const counts: Record<Filter, number> = {
    all: allCount,
    running: runningCount,
    idle: idleCount,
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase());
    const st = states[p.id]?.status || "idle";
    const matchesFilter =
      filter === "all" ||
      (filter === "running" && (st === "running" || st === "starting")) ||
      (filter === "idle" && (st === "idle" || st === "failed"));
    return matchesSearch && matchesFilter;
  });

  return (
    <aside className="h-full w-full flex flex-col bg-[#0f0f13] border border-[#22222c] rounded-2xl select-none shrink-0 overflow-hidden shadow-lg">
      {/* Header bar: Single Menu Toggle Icon */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1f1f28] bg-[#0c0c0f] shrink-0">
        <Button
          size="icon"
          variant="ghost"
          title={isCompact ? "Expand Sidebar" : "Collapse Sidebar"}
          onClick={onToggleCompact}
          className="w-7 h-7 text-[#94a3b8] hover:text-white hover:bg-[#1a1a24] rounded-lg">
          <PanelLeft size={16} />
        </Button>
      </div>

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
                      ? "bg-[#22222c] text-white border border-[#333342] font-semibold"
                      : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[#16161c] border border-transparent"
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
                  <span className="opacity-70 font-mono">({counts[f]})</span>
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
            {!isCompact ? "No projects found" : "—"}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const state = states[project.id] || { status: "idle" };
            const isSelected = project.id === selectedProjectId;
            const isRunning = state.status === "running";
            const isStarting = state.status === "starting";
            const isFailed = state.status === "failed";
            const activePort = project.port;
            const dotClass = isRunning
              ? "dot-running"
              : isStarting
                ? "dot-starting"
                : isFailed
                  ? "dot-failed"
                  : "dot-idle";
            const stripColor = isRunning
              ? "bg-emerald-500"
              : isFailed
                ? "bg-red-500"
                : "bg-blue-500";

            if (isCompact) {
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  title={project.name}
                  className={`flex flex-col items-center justify-center p-2 rounded-[var(--radius)] cursor-pointer transition-all duration-150 relative group ${
                    isSelected
                      ? "bg-[#1e1e26] border border-[#30303d] text-white shadow-sm"
                      : "bg-transparent border border-transparent text-[#e4e4e7] hover:bg-[#16161e] hover:text-white"
                  }`}>
                  {isSelected && (
                    <span
                      className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${stripColor}`}
                    />
                  )}

                  <div className="relative flex items-center justify-center h-5 w-5">
                    <span className={dotClass} />
                  </div>
                  <span className="text-[0.58rem] font-mono text-zinc-500 mt-1">
                    {state.isSleeping ? "slp" : String(activePort).slice(-4)}
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
                    ? "bg-[#1e1e26] border border-[#30303d] text-white shadow-sm"
                    : "bg-transparent border border-transparent text-[#e4e4e7] hover:bg-[#16161e] hover:text-white"
                }`}>
                {/* Active strip on left side */}
                {isSelected && (
                  <span
                    className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${stripColor}`}
                  />
                )}

                <span
                  className={`text-xs truncate font-medium ${isSelected ? "text-white pl-1" : ""}`}>
                  {project.name}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={dotClass} />
                  <span className="font-mono text-[0.65rem] text-[#64748b]">
                    {state.isSleeping ? "asleep" : activePort}
                  </span>

                  {isRunning && state.memoryMb !== undefined && (
                    <span
                      title={`RAM: ${state.memoryMb} MB`}
                      className="text-[0.62rem] font-mono px-1 py-0.5 rounded font-medium bg-[#181822] text-[#94a3b8] border border-[#282836]">
                      {state.memoryMb}M
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action Footer Bar */}
      <div className="p-2 border-t border-[#1f1f28] bg-[#0c0c0f] flex items-center justify-around shrink-0">
        <Button
          onClick={onOpenAddModal}
          variant="primary"
          size="icon"
          title="Add Project"
          className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm">
          <Plus size={14} />
        </Button>

        {!isCompact && (
          <>
            <Button
              size="icon"
              variant="ghost"
              title="Desktop Widget"
              onClick={onToggleWidget}
              className="w-7 h-7 text-[#94a3b8] hover:text-white hover:bg-[#1a1a24] rounded-lg">
              <Monitor size={13} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Settings"
              onClick={onOpenSettings}
              className="w-7 h-7 text-[#94a3b8] hover:text-white hover:bg-[#1a1a24] rounded-lg">
              <SettingsIcon size={13} />
            </Button>
          </>
        )}
      </div>
    </aside>
  );
};
