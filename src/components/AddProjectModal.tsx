import React, { useState } from 'react';
import { Folder, Sparkles, Check } from 'lucide-react';
import { Project, FrameworkType } from '../../electron/types';
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
import { FormField, FormLabel, FormGrid } from './ui/form';

import { FRAMEWORK_OPTIONS } from '../lib/constants';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [framework, setFramework] = useState<FrameworkType>('generic');
  const [command, setCommand] = useState('npm run dev');
  const [port, setPort] = useState<number>(3000);
  const [isDetecting, setIsDetecting] = useState(false);

  const reset = () => {
    setPath(''); setName(''); setFramework('generic');
    setCommand('npm run dev'); setPort(3000);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectFolder = async () => {
    const selectedPath = await window.electronAPI.selectFolder();
    if (!selectedPath) return;
    setPath(selectedPath);
    setIsDetecting(true);
    try {
      const detected = await window.electronAPI.autoDetectProject(selectedPath);
      if (detected) {
        setName(detected.name || '');
        setFramework(detected.framework || 'generic');
        setCommand(detected.command || 'npm run dev');
        setPort(detected.port || 3000);
      }
    } catch (err) {
      console.error('Detection failed:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path || !name || !command || !port) return;
    onSave({
      id: `proj-${Math.random().toString(36).substring(2, 9)}`,
      name, path, framework,
      command, port: Number(port),
      createdAt: new Date().toISOString(),
    });
    handleClose();
  };

  const selectClass = 'w-full bg-[#1c1c20] border border-[#2e2e36] px-3 py-1.5 text-xs text-white outline-none focus:border-[--accent-primary] cursor-pointer rounded-[var(--radius)]';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Local Project</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="flex flex-col gap-4">
            {/* Directory Path */}
            <FormField>
              <FormLabel>Project Directory</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="C:\Projects\my-app"
                  required
                  mono
                />
                <Button type="button" onClick={handleSelectFolder} size="sm" className="shrink-0">
                  <Folder size={13} /> Browse
                </Button>
              </div>
              {isDetecting && (
                <span className="text-[0.7rem] text-amber-400 flex items-center gap-1 mt-1">
                  <Sparkles size={11} /> Auto-detecting configuration...
                </span>
              )}
            </FormField>

            {/* Project Name */}
            <FormField>
              <FormLabel>Project Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Portfolio Website"
                required
              />
            </FormField>

            {/* Framework & Port */}
            <FormGrid>
              <FormField>
                <FormLabel>Framework</FormLabel>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as FrameworkType)}
                  className={selectClass}
                >
                  {FRAMEWORK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField>
                <FormLabel>Port</FormLabel>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 3000)}
                  required
                  mono
                />
              </FormField>
            </FormGrid>

            {/* Command */}
            <FormField>
              <FormLabel>Dev Command</FormLabel>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npm run dev"
                required
                mono
                className="text-cyan-300"
              />
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="primary">
              <Check size={13} /> Save Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
