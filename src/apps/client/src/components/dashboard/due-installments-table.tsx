import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, cn, Alert, AlertTitle, AlertDescription } from "@copas/ui";
import { useInstallments, useMarkInstallmentPaid } from "@/lib/api/use-installments";
import { formatCurrency } from "@/lib/formatters";
import type { InstallmentDetailedItem, ReminderDispatchSummary } from "@copas/contracts";
import { useDispatchDueReminders, useDispatchInstallmentReminder } from "@/lib/api/use-reminders";

export interface DueInstallmentsTableProps {
  items?: InstallmentDetailedItem[];
  isLoading?: boolean;
  onMarkAsPaid?: (id: string) => void;
  isMutating?: boolean | ((id: string) => boolean);
  className?: string;
  onSelectInsured?: (insuredId: string) => void;
  onDispatchBatch?: () => Promise<void> | void;
  isDispatchingBatch?: boolean;
  onDispatchInstallment?: (installmentId: string, forceResend?: boolean) => Promise<void> | void;
  isDispatchingInstallment?: (installmentId: string) => boolean;
  batchSummary?: ReminderDispatchSummary | null;
  onDismissAlert?: () => void;
  conflictInstallment?: InstallmentDetailedItem | null;
  onCancelConflict?: () => void;
  onConfirmForceResend?: (id: string) => void;
}

function is409Conflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const res = err.response as Record<string, unknown> | undefined;
  return (
    err.status === 409 ||
    res?.status === 409 ||
    String(err.message ?? '').includes('409') ||
    Object.values(err).some(v => v === 409)
  );
}

function DueInstallmentsTableView({
  items,
  isLoading,
  onMarkAsPaid,
  isMutating,
  className,
  onSelectInsured,
  onDispatchBatch,
  isDispatchingBatch,
  onDispatchInstallment,
  isDispatchingInstallment,
  batchSummary,
  onDismissAlert,
  conflictInstallment,
  onCancelConflict,
  onConfirmForceResend,
}: DueInstallmentsTableProps) {
  const [internalConflictItem, setInternalConflictItem] = useState<InstallmentDetailedItem | null>(null);
  
  const activeConflictItem = conflictInstallment || internalConflictItem;

  const data = items ?? [];
  const loading = isLoading;
  const pendingCount = data.filter(i => i.status === 'pending').length;

  const handleMarkAsPaid = (id: string) => {
    if (onMarkAsPaid) {
      onMarkAsPaid(id);
    }
  };

  const isItemMutating = (id: string) => {
    if (typeof isMutating === 'function') return isMutating(id);
    if (isMutating !== undefined) return isMutating;
    return false;
  };

  const handleDispatchInstallment = async (id: string) => {
    if (onDispatchInstallment) {
      try {
        await onDispatchInstallment(id, false);
      } catch (error: unknown) {
        if (is409Conflict(error)) {
          const item = data.find(i => i.installmentId === id);
          if (item) {
            setInternalConflictItem(item);
          }
        } else {
          // Re-throw if not 409
          throw error;
        }
      }
    }
  };

  const handleCancelConflict = () => {
    setInternalConflictItem(null);
    if (onCancelConflict) onCancelConflict();
  };

  const handleConfirmResend = (id: string) => {
    setInternalConflictItem(null);
    if (onConfirmForceResend) {
      onConfirmForceResend(id);
    } else if (onDispatchInstallment) {
      onDispatchInstallment(id, true);
    }
  };

  return (
    <Card className={cn("w-full flex flex-col", className)}>
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center">
          <CardTitle className="text-lg sm:text-xl">Vencimientos del día</CardTitle>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground ml-2 shrink-0">
            {pendingCount} pendientes
          </span>
        </div>
        <Button
          onClick={onDispatchBatch}
          disabled={isDispatchingBatch || pendingCount === 0 || loading}
          aria-busy={isDispatchingBatch}
        >
          {isDispatchingBatch ? 'Enviando recordatorios...' : 'Enviar recordatorios de hoy'}
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 flex-1 min-h-0 flex flex-col">
        {batchSummary && (
          <Alert role="alert" className="mb-4" variant={batchSummary.errors?.length ? 'destructive' : 'default'}>
            <AlertTitle>Resumen de envíos</AlertTitle>
            <AlertDescription className="flex justify-between items-start">
              <div>
                Encolados: {batchSummary.totalEnqueued}. Omitidos: {batchSummary.totalSkipped}. Ya enviados: {batchSummary.totalAlreadySent}.
              </div>
              <Button variant="ghost" size="sm" onClick={onDismissAlert}>Cerrar</Button>
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="py-4 text-center my-auto">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground my-auto">
            No hay vencimientos pendientes para hoy
          </div>
        ) : (
          <div className="overflow-auto w-full flex-1 min-h-0 relative">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground uppercase border-b sticky top-0 bg-card z-10 shadow-xs">
                <tr>
                  <th className="px-3 py-2.5 bg-card">Asegurado</th>
                  <th className="px-3 py-2.5 bg-card">Compañía</th>
                  <th className="px-3 py-2.5 bg-card">Bien</th>
                  <th className="px-3 py-2.5 text-right bg-card">Monto a pagar</th>
                  <th className="px-3 py-2.5 text-center bg-card">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((item) => {
                  const dispatching = isDispatchingInstallment ? isDispatchingInstallment(item.installmentId) : false;
                  return (
                    <tr key={item.installmentId} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium">
                        {onSelectInsured && item.insuredId ? (
                          <button
                            type="button"
                            className="hover:underline cursor-pointer focus:outline-hidden text-left"
                            onClick={() => onSelectInsured(item.insuredId!)}
                          >
                            {item.insuredName}
                          </button>
                        ) : (
                          item.insuredName
                        )}
                      </td>
                      <td className="px-3 py-2.5">{item.companyName}</td>
                      <td className="px-3 py-2.5">{item.assetDescription}</td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {formatCurrency(item.totalAmount, item.currency ?? 'ARS')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(item.installmentId)}
                            disabled={isItemMutating(item.installmentId) || item.status === 'paid'}
                          >
                            {isItemMutating(item.installmentId) ? 'Procesando...' : item.status === 'paid' ? 'Pagado' : 'Marcar pagado'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDispatchInstallment(item.installmentId)}
                            disabled={dispatching || item.status === 'paid'}
                            aria-label={`Enviar recordatorio por WhatsApp a ${item.insuredName}`}
                            aria-busy={dispatching}
                          >
                            {dispatching ? 'Enviando...' : 'Notificar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {activeConflictItem && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardHeader>
              <CardTitle>Aviso de recordatorio</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Ya se notificó un recordatorio el día de hoy para la cuota de <strong>{activeConflictItem.insuredName}</strong>. 
                ¿Deseas reenviarlo de todos modos?
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleCancelConflict}>Cancelar</Button>
                <Button onClick={() => handleConfirmResend(activeConflictItem.installmentId)}>Reenviar recordatorio</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

function DueInstallmentsTableConnected(props: DueInstallmentsTableProps) {
  const query = useInstallments();
  const mutation = useMarkInstallmentPaid();

  const [batchSummary, setBatchSummary] = useState<ReminderDispatchSummary | null>(null);
  const [conflictInstallment, setConflictInstallment] = useState<InstallmentDetailedItem | null>(null);

  const { dispatchDueReminders, isDispatching: isDispatchingBatch } = useDispatchDueReminders({
    onSuccess: (summary) => setBatchSummary(summary),
  });

  const { dispatchInstallmentReminder, isDispatching: isDispatchingInstallment } = useDispatchInstallmentReminder();

  const handleDispatchBatch = async () => {
    try {
      await dispatchDueReminders();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatchInstallment = async (installmentId: string, forceResend: boolean = false) => {
    try {
      await dispatchInstallmentReminder(installmentId, forceResend);
    } catch (error: unknown) {
      if (is409Conflict(error)) {
        const item = query.data?.items.find(i => i.installmentId === installmentId);
        if (item) {
          setConflictInstallment(item);
        }
      } else {
        console.error(error);
      }
    }
  };

  return (
    <DueInstallmentsTableView
      {...props}
      items={query.data?.items ?? []}
      isLoading={query.isLoading}
      onMarkAsPaid={(id) => mutation.mutate(id)}
      isMutating={(id) => mutation.variables === id && mutation.isPending}
      onDispatchBatch={handleDispatchBatch}
      isDispatchingBatch={isDispatchingBatch}
      onDispatchInstallment={handleDispatchInstallment}
      isDispatchingInstallment={isDispatchingInstallment}
      batchSummary={batchSummary}
      onDismissAlert={() => setBatchSummary(null)}
      conflictInstallment={conflictInstallment}
      onCancelConflict={() => setConflictInstallment(null)}
      onConfirmForceResend={(id) => {
        setConflictInstallment(null);
        handleDispatchInstallment(id, true);
      }}
    />
  );
}

export function DueInstallmentsTable(props: DueInstallmentsTableProps) {
  if (props.items !== undefined) {
    return <DueInstallmentsTableView {...props} />;
  }
  return <DueInstallmentsTableConnected {...props} />;
}
