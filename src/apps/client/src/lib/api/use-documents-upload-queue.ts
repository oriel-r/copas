import { useState, useEffect, useCallback, useRef } from 'react';
import { validatePdfMetadata } from '@copas/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadQueueStatus;
  progress?: number;
  error?: string;
  policyAssetKey?: string;
  documentUrl?: string;
}

export interface UseDocumentsUploadQueueReturn {
  items: UploadQueueItem[];
  enqueueFiles: (files: File[]) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
}

let globalIdCounter = 0;

export function useDocumentsUploadQueue(): UseDocumentsUploadQueueReturn {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const startedIds = useRef<Set<string>>(new Set());

  let queryClient: any;
  try {
    queryClient = useQueryClient();
  } catch (e) {}

  useEffect(() => {
    const uploadingCount = items.filter((i) => i.status === 'uploading').length;
    const pendingItems = items.filter((i) => i.status === 'pending' && !startedIds.current.has(i.id));

    if (uploadingCount < 3 && pendingItems.length > 0) {
      const toStart = pendingItems.slice(0, 3 - uploadingCount);
      
      toStart.forEach((item) => startedIds.current.add(item.id));

      setItems((prev) =>
        prev.map((i) => {
          if (toStart.some((s) => s.id === i.id)) return { ...i, status: 'uploading' };
          return i;
        })
      );

      toStart.forEach((item) => {
        const uploadTask = async () => {
          try {
            const urlRes = await apiClient.policies['upload-url'].$post({
              json: { filename: item.file.name, contentType: 'application/pdf' },
            });

            if (!urlRes.ok) throw new Error(`Failed to get upload url: ${urlRes.status}`);
            const { uploadUrl, policyAssetKey } = await urlRes.json();

            const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: item.file,
              headers: { 'Content-Type': 'application/pdf' },
            });

            if (!uploadRes.ok) {
              const errData = await uploadRes.json().catch(() => ({}));
              throw new Error(errData.error || `Upload failed with status ${uploadRes.status}`);
            }

            const extractRes = await apiClient.policies.extract.$post({
              json: { policyAssetKey, documentUrl: policyAssetKey },
            });

            if (!extractRes.ok) throw new Error(`Extract failed with status ${extractRes.status}`);

            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: 'success', policyAssetKey, documentUrl: policyAssetKey }
                  : i
              )
            );
            if (queryClient) queryClient.invalidateQueries({ queryKey: ['policies'] });
          } catch (err: any) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, status: 'error', error: err.message || 'Error occurred' } : i
              )
            );
          }
        };

        uploadTask();
      });
    }
  }, [items, queryClient]);

  const enqueueFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadQueueItem[] = files.map((file) => {
        const validation = validatePdfMetadata(file.name, file.size, file.type);
        return {
          id: `item-${Date.now()}-${globalIdCounter++}`,
          file,
          status: validation.valid ? 'pending' : 'error',
          error: validation.error,
        };
      });

      setItems((prev) => [...prev, ...newItems]);
    },
    []
  );

  const retryItem = useCallback(
    (id: string) => {
      startedIds.current.delete(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'pending', error: undefined } : item
        )
      );
    },
    []
  );

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.status !== 'success'));
  }, []);

  const isUploading = items.some((i) => i.status === 'uploading');

  return {
    items,
    enqueueFiles,
    retryItem,
    clearCompleted,
    isUploading,
  };
}
