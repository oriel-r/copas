import { useEffect } from 'react';
import { useToastStore, type ToastItem, toast } from '@/lib/toast';

function ToastCard({ item }: { item: ToastItem }) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = setTimeout(() => {
      toast.dismiss(item.id);
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration]);

  const isError = item.variant === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      data-testid={`toast-${item.variant}`}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="shrink-0 mt-0.5">
        {item.variant === 'success' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {item.variant === 'error' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        )}
        {item.variant === 'info' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
        {item.variant === 'default' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
        {item.description && (
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 -mr-1 -mt-1 rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
