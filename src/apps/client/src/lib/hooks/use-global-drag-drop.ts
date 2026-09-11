import { useEffect, useRef, useState } from 'react';

export interface UseGlobalDragDropOptions {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

export interface UseGlobalDragDropReturn {
  isDragging: boolean;
}

export function useGlobalDragDrop(options?: UseGlobalDragDropOptions): UseGlobalDragDropReturn {
  const { onFilesDropped = () => {}, disabled = false } = options || {};
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const onFilesDroppedRef = useRef(onFilesDropped);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onFilesDroppedRef.current = onFilesDropped;
    disabledRef.current = disabled;
  }, [onFilesDropped, disabled]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounterRef.current++;
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (_e: DragEvent) => {
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (!disabledRef.current && e.dataTransfer?.files?.length) {
        onFilesDroppedRef.current(Array.from(e.dataTransfer.files));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    isDragging,
  };
}
