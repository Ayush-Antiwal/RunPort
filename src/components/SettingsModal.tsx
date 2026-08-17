import React, { useEffect, useState } from 'react';
import { Project, AppSettings, FrameworkType } from '../../electron/types';
import { FRAMEWORK_OPTIONS } from '../lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FormField, FormLabel, FormGrid } from './ui/form';
import { Switch } from './ui/switch';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  onSaveProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  initialTab?: 'general' | 'projects';
}

const ToggleItem = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <Card className="p-3 flex items-center justify-between gap-3 border-[#22222c] bg-[#141418]">
    <div>
      <div className="text-xs font-medium text-white">{label}</div>
      <div className="text-[0.7rem] text-zinc-400 mt-0.5 leading-tight">{description}</div>
    </div>
    <Switch checked={checked} onCheckedChange={() => onChange()} />
  </Card>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  projects = [],
  onSaveProject,
  onDeleteProject,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'projects'>(initialTab);
  const [settings, setSettings] = useState<AppSettings>({
    widgetAlwaysOnTop: true,
    startAtLogin: false,
    minimizeToTray: true,
    enableDynamicMemory: true,
    defaultMaxMemoryMb: 1024,
    enableAppMemoryOptimization: true,
  });
  const [isSaved, setIsSaved] = useState(false);

  // Projects search & editing state
  const [search, setSearch] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    command: string;
    port: number | string;
    framework: FrameworkType;
  }>({ name: '', command: '', port: 3000, framework: 'generic' });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditingProject(null);
      window.electronAPI.getSettings().then((res) => {
        if (res) setSettings(res);
      });
    }
  }, [isOpen, initialTab]);

  const handleToggle = async (key: keyof AppSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await window.electronAPI.updateSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  const handleStartEdit = (proj: Project) => {
    setEditingProject(proj);
    setEditForm({
      name: proj.name,
      command: proj.command,
      port: proj.port,
      framework: proj.framework,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !onSaveProject) return;
    onSaveProject({
      ...editingProject,
      name: editForm.name.trim(),
      command: editForm.command.trim(),
      port: Number(editForm.port),
      framework: editForm.framework,
    });
    setEditingProject(null);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()) ||
      p.framework.toLowerCase().includes(search.toLowerCase())
  );

  const selectClass =
    'w-full bg-[#141418] border border-[#24242e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 cursor-pointer rounded-lg';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px] bg-[#0c0c0f] border border-[#22222c] rounded-2xl shadow-2xl overflow-hidden p-0">
        {/* Compact Header */}
        <DialogHeader className="px-4 py-3 border-b border-[#1c1c24] bg-[#101014] flex items-center justify-between">
          <DialogTitle className="text-xs font-semibold text-white tracking-tight">Settings</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <div className="flex h-[360px]">
          {/* Text-Only Sidebar Tabs */}
          <div className="w-[130px] border-r border-[#1c1c24] bg-[#0e0e12] p-2 flex flex-col gap-1 shrink-0">
            <button
              onClick={() => { setActiveTab('general'); setEditingProject(null); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              General
            </button>
            <button
              onClick={() => { setActiveTab('projects'); setEditingProject(null); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                activeTab === 'projects'
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Projects</span>
              <span className="text-[0.65rem] font-mono opacity-60">({projects.length})</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#0c0c0f]">
            {activeTab === 'general' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-semibold text-white mb-0.5">General Preferences</div>
                  <div className="text-[0.7rem] text-zinc-400">Configure application behavior and desktop window settings</div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[0.68rem] font-medium text-zinc-400">App Optimization</div>
                  <ToggleItem
                    label="Self-Memory Optimization"
                    description="Force V8 garbage collection on minimize"
                    checked={settings.enableAppMemoryOptimization ?? true}
                    onChange={() => handleToggle('enableAppMemoryOptimization')}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[0.68rem] font-medium text-zinc-400">Desktop Integration</div>
                  <ToggleItem
                    label="Widget Always On Top"
                    description="Keep mini-widget floating above other windows"
                    checked={settings.widgetAlwaysOnTop}
                    onChange={() => handleToggle('widgetAlwaysOnTop')}
                  />
                  <ToggleItem
                    label="Minimize to System Tray"
                    description="Keep server manager running in system tray on close"
                    checked={settings.minimizeToTray}
                    onChange={() => handleToggle('minimizeToTray')}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {editingProject ? (
                  /* Inline Project Editor */
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 h-full">
                    <div className="flex items-center justify-between border-b border-[#1c1c24] pb-2">
                      <span className="text-xs font-semibold text-white">Edit Configuration</span>
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="text-[0.7rem] text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <FormGrid cols={2} className="gap-2.5">
                      <FormField>
                        <FormLabel>Project Name</FormLabel>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </FormField>

                      <FormField>
                        <FormLabel>Dev Command</FormLabel>
                        <Input
                          value={editForm.command}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, command: e.target.value }))}
                          mono
                          className="text-cyan-300"
                          required
                        />
                      </FormField>

                      <FormField>
                        <FormLabel>Port</FormLabel>
                        <Input
                          type="number"
                          value={editForm.port}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, port: e.target.value }))}
                          mono
                          required
                        />
                      </FormField>

                      <FormField>
                        <FormLabel>Framework</FormLabel>
                        <select
                          value={editForm.framework}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, framework: e.target.value as FrameworkType }))}
                          className={selectClass}
                        >
                          {FRAMEWORK_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </FormField>
                    </FormGrid>

                    <div className="mt-auto pt-2 flex justify-end gap-2 border-t border-[#1c1c24]">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingProject(null)}>
                        Back
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Save
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Project Search & Registry List */
                  <div className="flex flex-col h-full gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">Project Registry</div>
                        <div className="text-[0.7rem] text-zinc-400">Manage registered server commands and ports</div>
                      </div>
                    </div>

                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="h-7 text-xs"
                    />

                    <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5 mt-1">
                      {filteredProjects.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500 italic">
                          No matching projects
                        </div>
                      ) : (
                        filteredProjects.map((proj) => (
                          <div
                            key={proj.id}
                            className="bg-[#141418] border border-[#22222c] rounded-lg p-2 flex items-center justify-between gap-2 hover:border-[#2e2e3a] transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white truncate">
                                  {proj.name}
                                </span>
                                <span className="text-[0.65rem] font-mono text-cyan-300 shrink-0">
                                  :{proj.port}
                                </span>
                              </div>
                              <div className="text-[0.68rem] text-zinc-500 font-mono truncate mt-0.5">
                                {proj.path}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(proj)}
                                className="h-6 px-2 text-[0.68rem]"
                              >
                                Edit
                              </Button>
                              {onDeleteProject && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onDeleteProject(proj.id)}
                                  className="h-6 px-2 text-[0.68rem]"
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#1c1c24] bg-[#101014] flex items-center justify-between">
          {isSaved ? (
            <span className="text-[0.68rem] text-emerald-400 font-medium">
              Preferences saved
            </span>
          ) : (
            <span className="text-[0.68rem] text-zinc-500">Preferences auto-saved</span>
          )}
          <Button onClick={onClose} variant="default" size="sm" className="px-3 h-7 text-xs font-medium">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
