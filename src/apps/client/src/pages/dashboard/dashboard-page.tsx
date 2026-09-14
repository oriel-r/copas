import { AppShell } from '@/components/layout/app-shell'
import { DocumentUploadCard } from '@/components/policies/document-upload-card'
import { GlobalDropOverlay } from '@/components/policies/global-drop-overlay'
import { useDocumentsUploadQueue } from '@/lib/api/use-documents-upload-queue'
import { useGlobalDragDrop } from '@/lib/hooks/use-global-drag-drop'
import { DueInstallmentsTable } from '@/components/dashboard/due-installments-table'

export function DashboardPage() {

  const uploadQueue = useDocumentsUploadQueue()
  
  const { isDragging } = useGlobalDragDrop({
    onFilesDropped: uploadQueue.enqueueFiles,
  })

  return (
    <AppShell>
      <GlobalDropOverlay isDragging={isDragging} />
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5 py-4 relative">

        {/* Encabezado limpio con saludo */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Hola!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestioná los vencimientos del día y la carga de pólizas.
          </p>
        </div>

        {/* Layout: 2/3 para la tabla de vencimientos y 1/3 para la carga de pólizas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start w-full">
          <div className="lg:col-span-2 w-full">
            <DueInstallmentsTable />
          </div>
          <div className="lg:col-span-1 w-full">
            <DocumentUploadCard queue={uploadQueue} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
