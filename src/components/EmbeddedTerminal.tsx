import React, { useEffect, useState, useRef } from 'react';
import { Terminal as TerminalIcon, Trash2, Copy, Check, Search, Play } from 'lucide-react';
import { Project, LogLine, ProjectRuntimeState } from '../../electron/types';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface EmbeddedTerminalProps {
  project: Project | null;
  state?: ProjectRuntimeState;
  onStart?: () => void;
}

// Color coding for different log line types
const getLogColor = (log: LogLine): string => {
  if (log.type === 'system') return '#818cf8';
  if (log.type === 'stderr' || /error|failed|exception|fatal/i.test(log.text)) return '#fca5a5';
  if (/warn|warning|deprecated/i.test(log.text)) return '#fcd34d';
  if (/ready|started|listening|localhost|http/i.test(log.text)) return '#6ee7b7';
  return '#e2e8f0';
};

export const EmbeddedTerminal: React.FC<EmbeddedTerminalProps> = ({ project, state, onStart }) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;
    window.electronAPI.getProjectLogs(project.id).then((l) => setLogs((l || []).slice(-200)));

    const unsubBatched = window.electronAPI.onProjectLogsBatched?.((data) => {
      if (data.projectId === project.id && data.logs?.length > 0) {
        setLogs((prev) => [...prev, ...data.logs].slice(-200));
      }
    });

    const unsubSingle = window.electronAPI.onProjectLogAdded((line) => {
      if (line.projectId === project.id) {
        setLogs((prev) => [...prev, line].slice(-200));
      }
    });

    const unsubCleared = window.electronAPI.onProjectLogsCleared((d) => {
      if (d.projectId === project.id) setLogs([]);
    });

    return () => {
      if (unsubBatched) unsubBatched();
      unsubSingle();
      unsubCleared();
    };
  }, [project?.id]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs]);

  if (!project) {
    return (
      <div className="flex-1 bg-[#07070a] flex items-center justify-center text-[0.82rem] text-[#64748b]">
        Select a project to view real-time terminal logs
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = filter
    ? logs.filter((l) => l.text.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="flex-1 flex flex-col bg-[#060608] border-t border-[#22222a] overflow-hidden">
      {/* Terminal header bar */}
      <div
        className="h-8 px-3.5 bg-[#0f0f13] border-b border-[#22222a] flex items-center justify-between shrink-0 select-none"
      >
        {/* Left: Title */}
        <div className="flex items-center gap-2">
          <TerminalIcon size={13} className="text-zinc-300" />
          <span className="text-[0.78rem] font-semibold text-white tracking-tight">Terminal</span>
          <span className="text-[0.68rem] text-[#64748b] font-mono px-1.5 py-0.5 rounded bg-[#17171d] border border-[#262632]">
            {project.command}
          </span>
          <Badge variant="default" className="normal-case font-mono text-[0.65rem]">
            {logs.length} lines
          </Badge>
        </div>

        {/* Right: Grouped Controls (Search + Icon Buttons next to it) */}
        <div className="flex items-center gap-1.5 no-drag">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="pl-6 h-6 text-[0.7rem] w-32 bg-[#16161d] border-[#262632] focus:border-zinc-400"
            />
          </div>

          <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy all logs"}
            className="h-6 w-6 rounded flex items-center justify-center bg-[#1c1c24] hover:bg-[#2e2e3a] text-zinc-100 transition-all cursor-pointer border border-[#323242]"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          <button
            onClick={() => window.electronAPI.clearProjectLogs(project.id)}
            title="Clear logs"
            className="h-6 w-6 rounded flex items-center justify-center bg-[#1c1c24] hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer border border-[#323242] hover:border-red-500/30"
          >
            <Trash2 size={11} />
          </button>

          <button
            onClick={() => window.electronAPI.openInTerminal(project.path)}
            title="Open in External Terminal"
            className="h-6 w-6 rounded flex items-center justify-center bg-[#1c1c24] hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer border border-[#323242] hover:border-cyan-500/30"
          >
            <TerminalIcon size={11} />
          </button>
        </div>
      </div>

      {/* Log stream */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[0.78rem] leading-relaxed bg-[#060608] select-text flex flex-col"
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none border border-dashed border-[#22222a] rounded-lg m-4 bg-[#0a0a0c]">
            <TerminalIcon size={24} className="text-[#3f3f46] mb-3 animate-pulse" />
            <p className="text-xs text-[#a1a1aa] mb-1 font-semibold">Terminal is Offline</p>
            <p className="text-[0.7rem] text-[#71717a] mb-4 text-center max-w-xs leading-relaxed">
              No server output captured. Start the development server to see live logs and build progress.
            </p>
            {state?.status !== 'running' && state?.status !== 'starting' && (
              <button
                onClick={onStart}
                className="h-8 px-4 text-xs font-semibold bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all rounded cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Play size={11} fill="currentColor" /> Start Server
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              style={{ color: getLogColor(log), userSelect: 'text', WebkitUserSelect: 'text' }}
              className="mb-0.5 whitespace-pre-wrap break-words select-text hover:bg-white/[0.02] px-1 rounded transition-colors"
            >
              <span className="text-[#3b3b4a] text-[0.68rem] mr-2 select-none font-mono">[{log.timestamp}]</span>
              {log.text}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
