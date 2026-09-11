import type { DragEvent } from 'react';
import UploadIcon from '~icons/material-symbols/upload-file';

export interface GlobalDropOverlayProps {
  isDragging: boolean;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

export function GlobalDropOverlay({ isDragging, onDrop }: GlobalDropOverlayProps) {
  if (!isDragging) return null;

  return (
    <div
      data-testid="global-drop-overlay"
      onDrop={onDrop}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6 pointer-events-none select-none"
    >
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary rounded-xl max-w-lg text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl bg-card/60">
        <UploadIcon className="w-16 h-16 text-primary animate-bounce" />
        <h3 className="text-2xl font-bold tracking-tight">Soltá tus pólizas en PDF aquí</h3>
        <p className="text-sm text-muted-foreground">
          Subida automática inmediata (máximo 15MB por archivo)
        </p>
      </div>
    </div>
  );
}
