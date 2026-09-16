import { Card, CardHeader, CardTitle, CardContent, Button, cn } from "@copas/ui";
import { useInstallments, useMarkInstallmentPaid } from "@/lib/api/use-installments";
import { formatCurrency } from "@/lib/formatters";
import type { InstallmentDetailedItem } from "@copas/contracts";

export interface DueInstallmentsTableProps {
  items?: InstallmentDetailedItem[];
  isLoading?: boolean;
  onMarkAsPaid?: (id: string) => void;
  isMutating?: boolean | ((id: string) => boolean);
  className?: string;
}

function DueInstallmentsTableView({
  items,
  isLoading,
  onMarkAsPaid,
  isMutating,
  className
}: DueInstallmentsTableProps) {
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

  return (
    <Card className={cn("w-full flex flex-col", className)}>
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between shrink-0">
        <div>
          <CardTitle className="text-lg sm:text-xl">Vencimientos del día</CardTitle>
          <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground ml-2 shrink-0">
          {pendingCount} pendientes
        </span>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 flex-1 min-h-0 flex flex-col">
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
                {data.map((item) => (
                  <tr key={item.installmentId} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{item.insuredName}</td>
                    <td className="px-3 py-2.5">{item.companyName}</td>
                    <td className="px-3 py-2.5">{item.assetDescription}</td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {formatCurrency(item.totalAmount, item.currency ?? 'ARS')}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(item.installmentId)}
                        disabled={isItemMutating(item.installmentId) || item.status === 'paid'}
                      >
                        {isItemMutating(item.installmentId) ? 'Procesando...' : item.status === 'paid' ? 'Pagado' : 'Marcar pagado'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DueInstallmentsTableConnected(props: DueInstallmentsTableProps) {
  const query = useInstallments();
  const mutation = useMarkInstallmentPaid();

  return (
    <DueInstallmentsTableView
      {...props}
      items={query.data?.items ?? []}
      isLoading={query.isLoading}
      onMarkAsPaid={(id) => mutation.mutate(id)}
      isMutating={(id) => mutation.variables === id && mutation.isPending}
    />
  );
}

export function DueInstallmentsTable(props: DueInstallmentsTableProps) {
  if (props.items !== undefined) {
    return <DueInstallmentsTableView {...props} />;
  }
  return <DueInstallmentsTableConnected {...props} />;
}
