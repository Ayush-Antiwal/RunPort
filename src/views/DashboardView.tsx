import React, { useEffect, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { Project, ProjectRuntimeState } from '../../electron/types';
import { Sidebar } from '../components/Sidebar';
import { ProjectDetailView } from '../components/ProjectDetailView';
import { EmbeddedTerminal } from '../components/EmbeddedTerminal';
import { AddProjectModal } from '../components/AddProjectModal';
import { SettingsModal } from '../components/SettingsModal';
import { Button } from '../components/ui/button';

export const DashboardView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<Record<string, ProjectRuntimeState>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'projects'>('general');
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);

  const loadProjectsAndStates = async () => {
    try {
      const list = await window.electronAPI.getProjects();
      const currentStates = await window.electronAPI.getProjectStates();
      const projList = list || [];
      setProjects(projList);
      setStates(currentStates || {});
      if (projList.length > 0 && !selectedProjectId) setSelectedProjectId(projList[0].id);
    } catch (err) {
      console.error('Failed to load projects/states:', err);
    }
  };

  useEffect(() => {
    loadProjectsAndStates();
    const unsub = window.electronAPI.onProjectStateChanged(({ projectId, state }) => {
      setStates((prev) => ({ ...prev, [projectId]: state }));
    });
    const unsubList = window.electronAPI.onProjectsUpdated?.((list) => {
      setProjects(list || []);
    });
    return () => {
      unsub();
      if (unsubList) unsubList();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCompact(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      if (!selectedProjectId || !projects.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(projects[0].id);
      }
    } else {
      setSelectedProjectId(null);
    }
  }, [projects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedState: ProjectRuntimeState = selectedProject
    ? states[selectedProject.id] || { status: 'idle' }
    : { status: 'idle' };

  const handleSaveProject = async (project: Project) => {
    const updated = await window.electronAPI.saveProject(project);
    setProjects(updated);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remove this project? (Source files will not be deleted)')) {
      const updated = await window.electronAPI.deleteProject(id);
      setProjects(updated);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-[#08080a] text-white p-2.5 gap-2.5 overflow-hidden select-none">
      {/* Sidebar container */}
      <div className={`${isSidebarCompact ? 'w-14' : 'w-60'} h-full shrink-0 transition-all duration-150 flex flex-col`}>
        <Sidebar
          projects={projects}
          states={states}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onStartAll={() => window.electronAPI.startAll()}
          onStopAll={() => window.electronAPI.stopAll()}
          onToggleWidget={() => window.electronAPI.toggleWidgetWindow()}
          onOpenSettings={() => { setSettingsInitialTab('general'); setIsSettingsOpen(true); }}
          isCompact={isSidebarCompact}
          onToggleCompact={() => setIsSidebarCompact(!isSidebarCompact)}
        />
      </div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 gap-2.5 overflow-hidden">
        {selectedProject ? (
          <>
            <div className="shrink-0 bg-[#0f0f13] border border-[#22222c] rounded-2xl overflow-hidden shadow-lg">
              <ProjectDetailView
                project={selectedProject}
                state={selectedState}
                onStart={(p, portOverride) => window.electronAPI.startProject(p, portOverride)}
                onStop={(id) => window.electronAPI.stopProject(id)}
                onRestart={(p) => window.electronAPI.restartProject(p)}
                onDelete={handleDelete}
                onSaveProject={handleSaveProject}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <EmbeddedTerminal
                project={selectedProject}
                state={selectedState}
                onStart={() => window.electronAPI.startProject(selectedProject)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-[#0f0f13] border border-[#22222c] rounded-2xl shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-[#262632] flex items-center justify-center mb-4 shadow-inner">
              <Layers size={32} className="text-[--text-dim]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Projects Registered
            </h3>
            <p className="text-xs text-[--text-dim] max-w-sm mb-6 leading-relaxed">
              Add your Next.js, Vite, Node, Python, or Go projects to manage them all from one dashboard.
            </p>
            <Button variant="primary" size="md" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={14} /> Add Your First Project
            </Button>
          </div>
        )}
      </main>

      <AddProjectModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleSaveProject} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projects={projects}
        onSaveProject={handleSaveProject}
        onDeleteProject={handleDelete}
        initialTab={settingsInitialTab}
      />
    </div>
  );
};
