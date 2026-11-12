import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { validatePdfMetadata } from '@copas/contracts';
import { QueryClientContext } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { toast } from '../toast';

export type UploadQueueStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadQueueStatus;
  progress?: number;
  error?: string;
  policyAssetKey?: string;
  documentUrl?: string;
  aiExtractionResultId?: string;
  policyId?: string;
  policyNumber?: string;
  processingStartedAt?: number;
}

export interface UseDocumentsUploadQueueReturn {
  items: UploadQueueItem[];
  enqueueFiles: (files: File[]) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
}

interface ExtractionPollResponse {
  status?: string;
  policyId?: string;
  policyNumber?: string;
  insuredName?: string;
  error?: string;
  errorMessage?: string;
  result?: {
    policy?: { policyNumber?: string };
    insured?: { fullName?: string };
    [key: string]: unknown;
  };
  policy?: { policyNumber?: string };
  insured?: { fullName?: string };
}

let globalIdCounter = 0;
const POLLING_INTERVAL_MS = 2500;
const MAX_PROCESSING_TIMEOUT_MS = 180000; // 3 minutes

export function useDocumentsUploadQueue(): UseDocumentsUploadQueueReturn {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const startedIds = useRef<Set<string>>(new Set());
  const pollingItemIds = useRef<Set<string>>(new Set());
  const notifiedItemIds = useRef<Set<string>>(new Set());

  const queryClient = useContext(QueryClientContext);

  // 1. Process pending items and upload
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

            const extractData = (typeof extractRes.json === 'function' ? await extractRes.json().catch(() => null) : null) as { aiExtractionResultId?: string } | null;
            const aiExtractionResultId = extractData?.aiExtractionResultId;

            if (aiExtractionResultId) {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        status: 'processing',
                        policyAssetKey,
                        documentUrl: policyAssetKey,
                        aiExtractionResultId,
                        processingStartedAt: Date.now(),
                      }
                    : i
                )
              );
            } else {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, status: 'success', policyAssetKey, documentUrl: policyAssetKey }
                    : i
                )
              );
              if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['policies'] });
                queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
                queryClient.invalidateQueries({ queryKey: ['due-installments'] });
                queryClient.invalidateQueries({ queryKey: ['installments'] });
                queryClient.invalidateQueries({ queryKey: ['insureds'] });
              }
            }
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error occurred';
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, status: 'error', error: errorMessage } : i
              )
            );
          }
        };

        uploadTask();
      });
    }
  }, [items, queryClient]);

  // 2. Polling for processing items
  useEffect(() => {
    const processingItems = items.filter(
      (item) => item.status === 'processing' && item.aiExtractionResultId
    );

    if (processingItems.length === 0) return;

    let isSubscribed = true;

    const poll = async () => {
      for (const item of processingItems) {
        if (!isSubscribed) break;

        // Skip if already notified (completed or error) to prevent duplicate toasts
        if (notifiedItemIds.current.has(item.id)) continue;

        // Check timeout
        if (item.processingStartedAt && Date.now() - item.processingStartedAt > MAX_PROCESSING_TIMEOUT_MS) {
          notifiedItemIds.current.add(item.id);
          toast.error('Tiempo de espera agotado', {
            description: `El procesamiento de ${item.file.name} demoró más de lo esperado.`,
          });
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'error', error: 'Tiempo de espera agotado al procesar la póliza' }
                : i
            )
          );
          continue;
        }

        // Avoid overlapping in-flight polling requests for the same item
        if (pollingItemIds.current.has(item.id)) continue;
        pollingItemIds.current.add(item.id);

        try {
          const pollRes = await apiClient.policies.extractions[':id'].$get({
            param: { id: item.aiExtractionResultId! },
          });

          if (!isSubscribed) return;
          if (!pollRes.ok) continue;

          const data = (await pollRes.json()) as ExtractionPollResponse;
          if (!isSubscribed) return;

          const isCompleted =
            data.status === 'on_review' ||
            data.status === 'approved' ||
            data.status === 'approved_with_corrections' ||
            data.status === 'completed' ||
            Boolean(data.policyId);
          const isFailed = data.status === 'failed' || data.status === 'error';

          if (isCompleted) {
            notifiedItemIds.current.add(item.id);

            const policyNumber =
              data.result?.policy?.policyNumber ||
              data.policy?.policyNumber ||
              data.policyNumber;
            const insuredName =
              data.result?.insured?.fullName ||
              data.insured?.fullName ||
              data.insuredName;

            const title = insuredName
              ? `¡Póliza de ${insuredName} procesada!`
              : policyNumber
                ? `¡Póliza Nº ${policyNumber} procesada!`
                : '¡Póliza procesada con éxito!';

            const description = insuredName && policyNumber
              ? `Póliza Nº ${policyNumber} registrada en el sistema.`
              : policyNumber
                ? `Póliza Nº ${policyNumber} registrada en el sistema.`
                : `${item.file.name} ha sido procesada e insertada en el sistema.`;

            toast.success(title, { description });

            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: 'success',
                      policyId: data.policyId,
                      policyNumber: policyNumber || undefined,
                    }
                  : i
              )
            );

            if (queryClient) {
              queryClient.invalidateQueries({ queryKey: ['policies'] });
              queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
              queryClient.invalidateQueries({ queryKey: ['due-installments'] });
              queryClient.invalidateQueries({ queryKey: ['installments'] });
              queryClient.invalidateQueries({ queryKey: ['insureds'] });
            }
          } else if (isFailed) {
            notifiedItemIds.current.add(item.id);

            const errorDescription =
              data.error ||
              data.errorMessage ||
              `No se pudo extraer la información de ${item.file.name}.`;

            toast.error('Error al procesar póliza', {
              description: typeof errorDescription === 'string' ? errorDescription : `No se pudo extraer la información de ${item.file.name}.`,
            });

            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: 'error',
                      error: typeof errorDescription === 'string' ? errorDescription : 'Error en la extracción automática del documento',
                    }
                  : i
              )
            );
          }
        } catch {
          // Blip on polling will retry next tick
        } finally {
          pollingItemIds.current.delete(item.id);
        }
      }
    };

    const intervalId = setInterval(poll, POLLING_INTERVAL_MS);
    void poll();

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
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
      pollingItemIds.current.delete(id);
      notifiedItemIds.current.delete(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'pending',
                error: undefined,
                aiExtractionResultId: undefined,
                processingStartedAt: undefined,
              }
            : item
        )
      );
    },
    []
  );

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.status !== 'success'));
  }, []);

  const isUploading = items.some((i) => i.status === 'uploading' || i.status === 'processing');

  return {
    items,
    enqueueFiles,
    retryItem,
    clearCompleted,
    isUploading,
  };
}
