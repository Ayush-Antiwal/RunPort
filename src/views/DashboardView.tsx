import React, { useEffect, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { ProjectRuntimeState } from '../../electron/types';
import { Sidebar } from '../components/Sidebar';
import { ProjectDetailView } from '../components/ProjectDetailView';
import { EmbeddedTerminal } from '../components/EmbeddedTerminal';
import { AddProjectModal } from '../components/AddProjectModal';
import { SettingsModal } from '../components/SettingsModal';
import { Button } from '../components/ui/button';
import { useProjectsAndStates } from '../hooks/useProjectsAndStates';

export const DashboardView: React.FC = () => {
  const { projects, states, saveProject, deleteProject } = useProjectsAndStates();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'projects'>('general');
  const [isSidebarCompact, setIsSidebarCompact] = useState<boolean>(false);

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
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedState: ProjectRuntimeState = selectedProject
    ? states[selectedProject.id] ?? { status: 'idle' }
    : { status: 'idle' };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this project? (Source files will not be deleted)')) {
      await deleteProject(id);
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
          onToggleWidget={() => window.electronAPI.toggleWidgetWindow()}
          onOpenSettings={() => {
            setSettingsInitialTab('general');
            setIsSettingsOpen(true);
          }}
          isCompact={isSidebarCompact}
          onToggleCompact={() => setIsSidebarCompact((prev) => !prev)}
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

      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={saveProject}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projects={projects}
        onSaveProject={saveProject}
        onDeleteProject={handleDelete}
        initialTab={settingsInitialTab}
      />
    </div>
  );
};
