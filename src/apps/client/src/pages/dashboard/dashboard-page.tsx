import { AppShell } from '@/components/layout/app-shell'
import { DocumentUploadCard } from '@/components/policies/document-upload-card'
import { GlobalDropOverlay } from '@/components/policies/global-drop-overlay'
import { useDocumentsUploadQueue } from '@/lib/api/use-documents-upload-queue'
import { useGlobalDragDrop } from '@/lib/hooks/use-global-drag-drop'
import { DueInstallmentsTable } from '@/components/dashboard/due-installments-table'
import { DashboardStatsCard } from '@/components/dashboard/dashboard-stats-card'

export function DashboardPage() {

  const uploadQueue = useDocumentsUploadQueue()
  
  const { isDragging } = useGlobalDragDrop({
    onFilesDropped: uploadQueue.enqueueFiles,
  })

  return (
    <AppShell>
      <GlobalDropOverlay isDragging={isDragging} />
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5 py-3 sm:py-4 flex flex-col lg:h-[calc(100vh-8.5rem)]">

        {/* Encabezado limpio con saludo */}
        <div className="mb-3 sm:mb-4 shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Hola!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestioná los vencimientos del día y la carga de pólizas.
          </p>
        </div>

        {/* Layout Bento: 2/3 (vencimientos arriba + carga horizontal compacta abajo) y 1/3 para estadísticas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[1fr_auto] gap-3.5 sm:gap-4 items-stretch w-full flex-1 min-h-0">
          {/* Bloque 1: Vencimientos del día (2/3 superior en desktop, 1° en mobile) */}
          <div className="order-1 lg:col-start-1 lg:col-end-3 lg:row-start-1 lg:row-end-2 min-h-0 flex flex-col">
            <DueInstallmentsTable className="h-full" />
          </div>

          {/* Bloque 2: Estadísticas de la cartera (1/3 derecho en desktop ocupando ambas filas, 2° en mobile) */}
          <div className="order-2 lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3 min-h-0 flex flex-col">
            <DashboardStatsCard className="h-full overflow-y-auto" />
          </div>

          {/* Bloque 3: Carga de pólizas compacta horizontal (2/3 inferior en desktop, 3° en mobile) */}
          <div className="order-3 lg:col-start-1 lg:col-end-3 lg:row-start-2 lg:row-end-3 shrink-0">
            <DocumentUploadCard queue={uploadQueue} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
