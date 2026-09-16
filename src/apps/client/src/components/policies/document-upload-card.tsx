import { useRef } from 'react';
import { Card, CardContent, Button, cn } from '@copas/ui';
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
      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[96px]">
        {/* Lado izquierdo: Botón Cargar pólizas */}
        <div className="shrink-0 flex items-center">
          <Button
            size="default"
            data-testid="upload-documents-btn"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium px-4 h-10 shadow-xs"
          >
            <span>Cargar pólizas</span>
            <span className="sr-only">Subir documentos</span>
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

        {/* Zona central: Avance de archivos o indicación */}
        <div className="flex-1 min-w-0 flex items-center justify-start md:justify-center">
          {items.length > 0 ? (
            <div
              className="flex items-center gap-2.5 overflow-x-auto py-1 w-full scrollbar-thin"
              data-testid="upload-queue"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1.5 text-xs p-2.5 border border-border rounded-lg bg-card shrink-0 min-w-[190px] max-w-[250px] shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate max-w-[130px]" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
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
            <div className="w-full flex items-center justify-center border border-dashed border-border/80 rounded-lg px-4 py-2.5 bg-muted/20 text-muted-foreground text-xs sm:text-sm">
              <span>Presioná el botón o arrastrá y soltá para subir</span>
            </div>
          )}
        </div>

        {/* Lado derecho: Botón limpiar completados */}
        <div className="shrink-0 flex items-center justify-end">
          {hasSuccess && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearCompleted}
              className="h-9 px-3 text-xs"
            >
              Limpiar completados
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
