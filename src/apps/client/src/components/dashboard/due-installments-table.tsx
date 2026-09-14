import { Card, CardHeader, CardTitle, CardContent, Button } from "@copas/ui";
import { useInstallments, useMarkInstallmentPaid } from "@/lib/api/use-installments";
import { formatCurrency } from "@/lib/formatters";
import type { InstallmentDetailedItem } from "@copas/contracts";

interface DueInstallmentsTableProps {
  items?: InstallmentDetailedItem[];
  isLoading?: boolean;
  onMarkAsPaid?: (id: string) => void;
  isMutating?: boolean | ((id: string) => boolean);
}

function DueInstallmentsTableView({
  items,
  isLoading,
  onMarkAsPaid,
  isMutating
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
    <Card className="w-full">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg sm:text-xl">Vencimientos del día</CardTitle>
          <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground ml-2">
          {pendingCount} pendientes
        </span>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        {loading ? (
          <div className="py-4 text-center">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No hay vencimientos pendientes para hoy
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-3 py-2.5">Asegurado</th>
                  <th className="px-3 py-2.5">Compañía</th>
                  <th className="px-3 py-2.5">Bien</th>
                  <th className="px-3 py-2.5 text-right">Monto a pagar</th>
                  <th className="px-3 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.installmentId} className="border-b last:border-0 hover:bg-muted/50">
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

function DueInstallmentsTableConnected(_props: DueInstallmentsTableProps) {
  const query = useInstallments();
  const mutation = useMarkInstallmentPaid();

  return (
    <DueInstallmentsTableView
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
