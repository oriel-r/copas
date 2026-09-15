import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@copas/ui';
import { usePortfolioSummary } from '../../lib/api/use-portfolio-summary';
import FileIcon from '~icons/material-symbols/description';
import UsersIcon from '~icons/material-symbols/group';
import AttachMoneyIcon from '~icons/material-symbols/attach-money';
import ErrorIcon from '~icons/material-symbols/error';

export interface DashboardStatsCardProps {
  className?: string;
}

export function DashboardStatsCard({ className }: DashboardStatsCardProps) {
  const { data, isLoading, error } = usePortfolioSummary();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className={className} data-testid="dashboard-stats-card-loading">
        <CardHeader>
          <div className="animate-pulse bg-muted rounded h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse bg-muted rounded h-20 w-full" />
          <div className="animate-pulse bg-muted rounded h-20 w-full" />
          <div className="animate-pulse bg-muted rounded h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className} data-testid="dashboard-stats-card-error">
        <CardContent className="flex flex-col items-center justify-center p-6 h-[300px] text-muted-foreground">
          <ErrorIcon className="h-10 w-10 mb-4" />
          <p>Error al cargar estadísticas</p>
        </CardContent>
      </Card>
    );
  }

  const { activePoliciesCount, totalInsuredsCount, paidInstallmentsThisMonthCount, totalInstallmentsThisMonthCount, collectionRatePercentage, companiesDistribution } = data;

  const top3 = [...(companiesDistribution || [])].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];

  return (
    <Card className={className} data-testid="dashboard-stats-card">
      <CardHeader>
        <CardTitle>Resumen de Cartera</CardTitle>
        <CardDescription>Estadísticas clave del portafolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/cartera')} role="link"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mr-4 text-blue-600 dark:text-blue-300">
              <FileIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pólizas activas</p>
              <h3 className="text-2xl font-bold">{activePoliciesCount}</h3>
            </div>
          </div>
          
          <div 
            className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/cartera')} role="link"
          >
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mr-4 text-green-600 dark:text-green-300">
              <UsersIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total asegurados</p>
              <h3 className="text-2xl font-bold">{totalInsuredsCount}</h3>
            </div>
          </div>

          <div className="flex items-center p-4 border rounded-lg">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full mr-4 text-orange-600 dark:text-orange-300">
              <AttachMoneyIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cuotas del mes</p>
              <h3 className="text-2xl font-bold">{paidInstallmentsThisMonthCount} de {totalInstallmentsThisMonthCount}</h3>
              <p className="text-xs text-muted-foreground">{collectionRatePercentage}% de cobranza</p>
            </div>
          </div>
        </div>

        {activePoliciesCount === 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg">
            <p>Aún no tienes pólizas activas. Sube tus primeros documentos para ver la distribución de compañías.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Distribución por Compañía</h4>
            <div className="h-4 w-full flex rounded-full overflow-hidden">
              {top3.map((comp, idx) => (
                <div 
                  key={comp.companyId} 
                  className={`h-full ${colors[idx % colors.length]}`} 
                  style={{ width: `${Math.trunc(comp.percentage)}%` }}
                  title={`${comp.companyName}: ${Math.trunc(comp.percentage)}%`}
                />
              ))}
              {top3.reduce((acc, c) => acc + c.percentage, 0) < 100 && (
                <div 
                  className="h-full bg-slate-200 dark:bg-slate-700" 
                  style={{ width: `${100 - top3.reduce((acc, c) => acc + c.percentage, 0)}%` }}
                  title="Otras"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {top3.map((comp, idx) => (
                <div key={comp.companyId} className="flex items-center text-sm">
                  <div className={`w-3 h-3 rounded-full mr-2 ${colors[idx % colors.length]}`} />
                  <span className="font-medium">{comp.companyName}</span>
                  <span className="text-muted-foreground ml-1">
                    ({Math.trunc(comp.percentage)}%, {comp.activePoliciesCount})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
