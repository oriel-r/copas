import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@copas/ui';
import type { DashboardStatsResponse, CompanyDistributionItem } from '@copas/contracts/insurance';
import { usePortfolioSummary } from '../../lib/api/use-portfolio-summary';
import FileIcon from '~icons/material-symbols/description';
import UsersIcon from '~icons/material-symbols/group';
import AttachMoneyIcon from '~icons/material-symbols/attach-money';
import ErrorIcon from '~icons/material-symbols/error';

export interface DashboardStatsCardProps {
  className?: string;
  stats?: DashboardStatsResponse;
  data?: DashboardStatsResponse;
}

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COLOR_PALETTE = [
  { stroke: '#3b82f6', bg: 'bg-blue-500' },
  { stroke: '#22c55e', bg: 'bg-green-500' },
  { stroke: '#f97316', bg: 'bg-orange-500' },
  { stroke: '#a855f7', bg: 'bg-purple-500' },
];

const OTHER_COLOR = {
  stroke: '#94a3b8',
  bg: 'bg-slate-400 dark:bg-slate-600',
};

interface DonutSlice {
  id: string;
  label: string;
  percentage: number;
  count: number;
  colorStroke: string;
  colorBg: string;
  title: string;
  dashLength: number;
  offset: number;
}

function computeDonutSlices(distribution: CompanyDistributionItem[] = []): DonutSlice[] {
  const top3 = [...distribution]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  const top3PercentageSum = top3.reduce((acc, c) => acc + c.percentage, 0);
  const remainingPercentage = Math.max(0, 100 - top3PercentageSum);
  const remainingPolicies = distribution
    .slice(3)
    .reduce((acc, c) => acc + c.activePoliciesCount, 0);

  let runningOffset = 0;
  const slices: DonutSlice[] = top3.map((comp, idx) => {
    const dashLength = (comp.percentage / 100) * CIRCUMFERENCE;
    const offset = runningOffset;
    runningOffset += dashLength;

    return {
      id: comp.companyId,
      label: comp.companyName,
      percentage: comp.percentage,
      count: comp.activePoliciesCount,
      colorStroke: COLOR_PALETTE[idx % COLOR_PALETTE.length].stroke,
      colorBg: COLOR_PALETTE[idx % COLOR_PALETTE.length].bg,
      title: `${comp.companyName}: ${Math.trunc(comp.percentage)}%`,
      dashLength,
      offset,
    };
  });

  if (top3PercentageSum < 100) {
    const dashLength = (remainingPercentage / 100) * CIRCUMFERENCE;
    const offset = runningOffset;
    runningOffset += dashLength;

    slices.push({
      id: 'other',
      label: 'Otras',
      percentage: remainingPercentage,
      count: remainingPolicies,
      colorStroke: OTHER_COLOR.stroke,
      colorBg: OTHER_COLOR.bg,
      title: 'Otras',
      dashLength,
      offset,
    });
  }

  return slices;
}

export function DashboardStatsCard({ className, stats: propStats, data: propData }: DashboardStatsCardProps) {
  const query = usePortfolioSummary();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <Card className={className} data-testid="dashboard-stats-card-loading">
        <CardHeader>
          <div data-testid="skeleton" data-slot="skeleton" className="animate-pulse bg-muted rounded h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div data-testid="skeleton" data-slot="skeleton" className="animate-pulse bg-muted rounded-lg h-20 w-full" />
          <div data-testid="skeleton" data-slot="skeleton" className="animate-pulse bg-muted rounded-lg h-20 w-full" />
          <div data-testid="skeleton" data-slot="skeleton" className="animate-pulse bg-muted rounded-lg h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = propStats ?? propData ?? query.data;

  if (query.error || !data) {
    return (
      <Card className={className} data-testid="dashboard-stats-card-error">
        <CardContent className="flex flex-col items-center justify-center p-6 h-[300px] text-muted-foreground">
          <ErrorIcon className="h-10 w-10 mb-4" />
          <p>Error al cargar estadísticas</p>
        </CardContent>
      </Card>
    );
  }

  const {
    activePoliciesCount,
    totalInsuredsCount,
    paidInstallmentsThisMonthCount,
    totalInstallmentsThisMonthCount,
    collectionRatePercentage,
    companiesDistribution,
  } = data;

  const slices = computeDonutSlices(companiesDistribution);
  const hoveredSlice = slices.find((s) => s.id === hoveredId);

  return (
    <Card className={className} data-testid="dashboard-stats-card">
      <CardHeader className="pb-3">
        <CardTitle>Resumen de Cartera</CardTitle>
        <CardDescription>Estadísticas clave del portafolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas directas en 2 columnas */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="flex flex-col justify-between p-3 border border-border/80 rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-all group"
            onClick={() => navigate('/cartera')}
            role="link"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate mr-1">
                Pólizas activas
              </span>
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 rounded-md text-blue-600 dark:text-blue-400 shrink-0">
                <FileIcon className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{activePoliciesCount}</h3>
          </div>

          <div
            className="flex flex-col justify-between p-3 border border-border/80 rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/40 transition-all group"
            onClick={() => navigate('/cartera')}
            role="link"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate mr-1">
                Total asegurados
              </span>
              <div className="p-1.5 bg-green-100 dark:bg-green-950/60 rounded-md text-green-600 dark:text-green-400 shrink-0">
                <UsersIcon className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{totalInsuredsCount}</h3>
          </div>
        </div>

        {/* Fila destacada a ancho completo para cobranzas */}
        <div className="p-3.5 border border-border/80 rounded-lg bg-card/60 space-y-2.5">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-950/60 rounded-md text-orange-600 dark:text-orange-400 shrink-0">
              <AttachMoneyIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Cuotas del mes</p>
              <h3 className="text-base font-bold tracking-tight mt-0.5 truncate">
                {paidInstallmentsThisMonthCount} de {totalInstallmentsThisMonthCount}
              </h3>
            </div>
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, collectionRatePercentage))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-right">
              {collectionRatePercentage}% de cobranza
            </p>
          </div>
        </div>

        {/* Sección de distribución */}
        {activePoliciesCount === 0 ? (
          <div className="mt-4 text-center text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg border border-dashed border-border">
            <p>Aún no tienes pólizas activas. Sube tus primeros documentos para ver la distribución de compañías.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Distribución por Compañía
            </h4>

            {/* Donut Chart SVG */}
            <div className="flex justify-center items-center py-1">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90 origin-center" viewBox="0 0 100 100">
                  {/* Pista base */}
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-muted/20"
                  />
                  {/* Segmentos de la torta */}
                  {slices.map((slice) => {
                    const isHovered = hoveredId === slice.id;
                    const dashSpace = CIRCUMFERENCE - slice.dashLength;

                    return (
                      <circle
                        key={slice.id}
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        fill="none"
                        stroke={slice.colorStroke}
                        strokeWidth={isHovered ? 12 : 9}
                        strokeDasharray={`${slice.dashLength} ${dashSpace}`}
                        strokeDashoffset={-slice.offset}
                        className={`transition-all duration-200 cursor-pointer ${
                          hoveredId && !isHovered ? 'opacity-40' : 'opacity-100'
                        }`}
                        onMouseEnter={() => setHoveredId(slice.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      />
                    );
                  })}
                </svg>

                {/* Centro del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                  {hoveredSlice ? (
                    <>
                      <span className="text-lg font-bold tracking-tight text-foreground">
                        {Math.trunc(hoveredSlice.percentage)}%
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[70px]">
                        {hoveredSlice.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold tracking-tight text-foreground">
                        {activePoliciesCount} total
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Pólizas
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Leyenda interactiva en lista vertical */}
            <div className="space-y-1.5 pt-1">
              {slices.map((slice) => {
                const isHovered = hoveredId === slice.id;
                return (
                  <div
                    key={slice.id}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-md transition-colors cursor-pointer text-xs ${
                      isHovered ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={slice.title}
                  >
                    <div className="flex items-center min-w-0 mr-2">
                      <span className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${slice.colorBg}`} />
                      <span className="font-medium truncate text-foreground" title={slice.label}>
                        {slice.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-right">
                      ({Math.trunc(slice.percentage)}%, {slice.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
