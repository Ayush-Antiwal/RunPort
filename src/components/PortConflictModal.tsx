import React, { useState } from 'react';
import { AlertCircle, Zap, Skull } from 'lucide-react';
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
import { Badge } from './ui/badge';

interface PortConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  port: number;
  suggestedPort: number;
  occupyingPid: number | null;
  onUseSuggestedPort: (port: number) => void;
  onFreeAndUseOriginalPort: (port: number) => void;
}

export const PortConflictModal: React.FC<PortConflictModalProps> = ({
  isOpen,
  onClose,
  port,
  suggestedPort,
  occupyingPid,
  onUseSuggestedPort,
  onFreeAndUseOriginalPort,
}) => {
  const [isKilling, setIsKilling] = useState(false);

  const handleFreeAndStart = async () => {
    setIsKilling(true);
    await onFreeAndUseOriginalPort(port);
    setIsKilling(false);
    onClose();
  };

  const handleUseSuggested = () => {
    onUseSuggestedPort(suggestedPort);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <DialogTitle>Port {port} Conflict Detected</DialogTitle>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3 py-2">
          <p className="text-[0.82rem] text-zinc-300 leading-relaxed">
            Configured port <Badge variant="default" className="font-mono text-cyan-300">{port}</Badge> is currently in use by an external process
            {occupyingPid && <span> (PID <code className="text-amber-300 font-mono">{occupyingPid}</code>)</span>}.
          </p>

          <div className="bg-[#17171a] border border-[#27272e] p-3 rounded-[var(--radius)] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[--text-dim]">Suggested Free Port:</span>
              <Badge variant="running" className="font-mono text-xs">{suggestedPort}</Badge>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex-wrap gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleFreeAndStart}
            disabled={isKilling}
          >
            <Skull size={13} /> {isKilling ? 'Killing Process...' : `Kill PID & Use ${port}`}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleUseSuggested}
          >
            <Zap size={13} /> Use Port {suggestedPort}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
