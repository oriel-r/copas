import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@copas/ui';
import { useDocumentsUploadQueue } from '../../lib/api/use-documents-upload-queue';
import type { UseDocumentsUploadQueueReturn } from '../../lib/api/use-documents-upload-queue';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return Number((bytes / 1024).toFixed(2)) + ' KB';
  return Number((bytes / (1024 * 1024)).toFixed(2)) + ' MB';
}

export interface DocumentUploadCardProps {
  queue?: UseDocumentsUploadQueueReturn;
}

export function DocumentUploadCard({ queue }: DocumentUploadCardProps) {
  const internalQueue = useDocumentsUploadQueue();
  const activeQueue = queue || internalQueue;
  const { items, enqueueFiles, retryItem, clearCompleted } = activeQueue;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSuccess = items.some((item) => item.status === 'success');

  return (
    <Card className="w-full" data-testid="document-upload-card">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-lg sm:text-xl">Cargar Pólizas</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Arrastrá tus pólizas en formato PDF a cualquier lugar de la pantalla o seleccioná archivos múltiples.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        <div className="flex gap-2">
          <Button data-testid="upload-documents-btn" onClick={() => fileInputRef.current?.click()}>
            Subir documentos
          </Button>
          {hasSuccess && (
            <Button variant="outline" onClick={clearCompleted}>
              Limpiar completados
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              enqueueFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />

        {items.length > 0 && (
          <div className="space-y-2 mt-4" data-testid="upload-queue">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col text-sm p-3 border border-border rounded-md bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[200px]" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatBytes(item.file.size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && <span className="text-muted-foreground">Pendiente...</span>}
                    {item.status === 'uploading' && <span className="text-primary font-medium">Subiendo...</span>}
                    {item.status === 'success' && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Subido ✓</span>}
                    {item.status === 'error' && (
                      <div className="flex items-center gap-2">
                        <span className="text-destructive font-medium">Error</span>
                        <Button size="sm" variant="outline" onClick={() => retryItem(item.id)}>
                          Reintentar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {item.status === 'error' && item.error && (
                  <span className="text-destructive text-xs mt-1">{item.error}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
