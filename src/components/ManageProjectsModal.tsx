import React, { useState } from 'react';
import { Folder, Search, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { Project } from '../../electron/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseButton,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { EditProjectModal } from './EditProjectModal';

interface ManageProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const ManageProjectsModal: React.FC<ManageProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSaveProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()) ||
      p.framework.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent style={{ maxWidth: '640px' }}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-[--accent-primary]" />
              <DialogTitle>Manage Projects ({projects.length})</DialogTitle>
            </div>
            <DialogCloseButton />
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative w-full">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-dim] pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registered projects by name, path, or framework..."
                className="pl-8 text-xs"
              />
            </div>

            {/* Projects List */}
            <div className="max-h-[360px] overflow-y-auto flex flex-col gap-2 pr-1">
              {filteredProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[--text-dim]">
                  No matching projects found.
                </div>
              ) : (
                filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-[#161619] border border-[#26262b] rounded-[var(--radius)] p-3 flex items-center justify-between gap-3 hover:border-[#33333d] transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {proj.name}
                        </span>
                        <Badge variant="default" className="text-[0.65rem] px-1.5 py-0">
                          {proj.framework}
                        </Badge>
                        <span className="text-[0.68rem] font-mono text-cyan-300">
                          Port {proj.port}
                        </span>
                      </div>
                      <span className="text-[0.7rem] text-[--text-dim] font-mono truncate">
                        {proj.path}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingProject(proj)}
                        title="Edit Project Configuration"
                        className="h-7 text-xs px-2.5"
                      >
                        <Edit3 size={12} /> Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteProject(proj.id)}
                        title="Delete Project from Manager"
                        className="h-7 text-xs px-2.5"
                      >
                        <Trash2 size={12} /> Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Edit Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSaveProject={(updated) => {
            onSaveProject(updated);
            setEditingProject(null);
          }}
        />
      )}
    </>
  );
};
