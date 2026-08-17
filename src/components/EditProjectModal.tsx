import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
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

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (project: Project) => void;
}

interface FormState {
  name: string;
  command: string;
  port: number | string;
  framework: FrameworkType;
}

interface FormErrors {
  name?: string;
  command?: string;
  port?: string;
}

import { FRAMEWORK_OPTIONS } from '../lib/constants';

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project, isOpen, onClose, onSaveProject,
}) => {
  const [formData, setFormData] = useState<FormState>({
    name: project.name,
    command: project.command,
    port: project.port,
    framework: project.framework,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Sync form state when project or modal open state changes
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name,
        command: project.command,
        port: project.port,
        framework: project.framework,
      });
      setErrors({});
    }
  }, [isOpen, project]);

  const handleChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.command.trim()) {
      newErrors.command = 'Dev command is required';
    }

    const numPort = Number(formData.port);
    if (!formData.port || isNaN(numPort) || numPort < 1 || numPort > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSaveProject({
      ...project,
      name: formData.name.trim(),
      command: formData.command.trim(),
      port: Number(formData.port),
      framework: formData.framework,
    });
    onClose();
  };

  const selectClass = 'w-full bg-[#1c1c20] border border-[#2e2e36] px-3 py-1.5 text-xs text-white outline-none focus:border-[--accent-primary] cursor-pointer rounded-[var(--radius)]';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project Configuration</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="flex flex-col gap-4">
            <FormGrid>
              {/* Project Name */}
              <FormField>
                <FormLabel>Project Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500/50 focus:border-red-500' : ''}
                />
                {errors.name && (
                  <span className="text-[0.7rem] text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle size={10} /> {errors.name}
                  </span>
                )}
              </FormField>

              {/* Dev Command */}
              <FormField>
                <FormLabel>Dev Command</FormLabel>
                <Input
                  value={formData.command}
                  onChange={(e) => handleChange('command', e.target.value)}
                  mono
                  className={`text-cyan-300 ${errors.command ? 'border-red-500/50 focus:border-red-500' : ''}`}
                />
                {errors.command && (
                  <span className="text-[0.7rem] text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle size={10} /> {errors.command}
                  </span>
                )}
              </FormField>

              {/* Port */}
              <FormField>
                <FormLabel>Port</FormLabel>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleChange('port', e.target.value)}
                  mono
                  className={errors.port ? 'border-red-500/50 focus:border-red-500' : ''}
                />
                {errors.port && (
                  <span className="text-[0.7rem] text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle size={10} /> {errors.port}
                  </span>
                )}
              </FormField>

              {/* Framework */}
              <FormField>
                <FormLabel>Framework</FormLabel>
                <select
                  value={formData.framework}
                  onChange={(e) => handleChange('framework', e.target.value as FrameworkType)}
                  className={selectClass}
                >
                  {FRAMEWORK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>

            </FormGrid>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">
              <Save size={13} /> Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
