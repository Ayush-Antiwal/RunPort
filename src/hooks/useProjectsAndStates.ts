import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectRuntimeState, AppSettings } from '../../electron/types';

export interface UseProjectsAndStatesReturn {
  projects: Project[];
  states: Record<string, ProjectRuntimeState>;
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  saveProject: (project: Project) => Promise<Project[]>;
  deleteProject: (id: string) => Promise<Project[]>;
}

export function useProjectsAndStates(): UseProjectsAndStatesReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<Record<string, ProjectRuntimeState>>({});
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [list, currentStates, appSettings] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getProjectStates(),
        window.electronAPI.getSettings(),
      ]);
      setProjects(list ?? []);
      setStates(currentStates ?? {});
      setSettings(appSettings ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      console.error('useProjectsAndStates error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    const unsubState = window.electronAPI.onProjectStateChanged(({ projectId, state }) => {
      setStates((prev) => ({ ...prev, [projectId]: state }));
    });

    const unsubProjects = window.electronAPI.onProjectsUpdated((list) => {
      setProjects(list ?? []);
    });

    return () => {
      unsubState();
      unsubProjects();
    };
  }, [refreshData]);

  const saveProject = useCallback(async (project: Project): Promise<Project[]> => {
    const updated = await window.electronAPI.saveProject(project);
    setProjects(updated ?? []);
    return updated ?? [];
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<Project[]> => {
    const updated = await window.electronAPI.deleteProject(id);
    setProjects(updated ?? []);
    return updated ?? [];
  }, []);

  return {
    projects,
    states,
    settings,
    isLoading,
    error,
    refreshData,
    saveProject,
    deleteProject,
  };
}
