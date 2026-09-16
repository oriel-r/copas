import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle, Button, cn } from '@copas/ui';
import { useDocumentsUploadQueue } from '../../lib/api/use-documents-upload-queue';
import type { UseDocumentsUploadQueueReturn } from '../../lib/api/use-documents-upload-queue';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return Number((bytes / 1024).toFixed(2)) + ' KB';
  return Number((bytes / (1024 * 1024)).toFixed(2)) + ' MB';
}

export interface DocumentUploadCardProps {
  queue?: UseDocumentsUploadQueueReturn;
  className?: string;
}

export function DocumentUploadCard({ queue, className }: DocumentUploadCardProps) {
  const internalQueue = useDocumentsUploadQueue();
  const activeQueue = queue || internalQueue;
  const { items, enqueueFiles, retryItem, clearCompleted } = activeQueue;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSuccess = items.some((item) => item.status === 'success');

  return (
    <Card className={cn('w-full', className)} data-testid="document-upload-card">
      <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Lado izquierdo: Título, descripción y botón */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-base font-semibold tracking-tight">
                Cargar Pólizas
              </CardTitle>
              {hasSuccess && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2"
                  onClick={clearCompleted}
                >
                  Limpiar completados
                </Button>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
              Arrastrá tus pólizas en formato PDF a cualquier lugar de la pantalla o seleccioná archivos múltiples.
            </CardDescription>
          </div>

          <Button
            size="sm"
            data-testid="upload-documents-btn"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            Subir documentos
          </Button>
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

        {/* Lado derecho: Avance de archivos en fila horizontal o placeholder */}
        <div className="flex-1 min-w-0 flex items-center md:justify-end">
          {items.length > 0 ? (
            <div
              className="flex items-center gap-2 overflow-x-auto py-1 w-full md:w-auto md:max-w-xl scrollbar-thin"
              data-testid="upload-queue"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 text-xs p-2 border border-border rounded-lg bg-card shrink-0 min-w-[170px] max-w-[230px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate max-w-[120px]" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div>
                      {item.status === 'pending' && (
                        <span className="text-muted-foreground text-[11px]">Pendiente...</span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="text-primary font-medium text-[11px] animate-pulse">
                          Subiendo...
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          Subido ✓
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-destructive font-medium text-[11px]">Error</span>
                      )}
                    </div>
                    {item.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => retryItem(item.id)}
                      >
                        Reintentar
                      </Button>
                    )}
                  </div>
                  {item.status === 'error' && item.error && (
                    <span className="text-destructive text-[10px] truncate" title={item.error}>
                      {item.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg px-3 py-1.5 bg-muted/20">
              <span>Arrastrá tus pólizas PDF aquí o hacé clic para seleccionar</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
