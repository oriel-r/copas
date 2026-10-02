import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, FormError } from '@copas/ui'
import { usePolicyUpload } from '@/lib/api/use-policy-upload'
import { getErrorMessage } from '@/lib/errors'
import UploadIcon from '~icons/material-symbols/upload-file'
import FileIcon from '~icons/material-symbols/description'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import CheckIcon from '~icons/material-symbols/check-circle'

export function PolicyDropzone() {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = usePolicyUpload()

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return
    uploadMutation.mutate(selectedFile)
  }

  const handleReset = () => {
    setSelectedFile(null)
    uploadMutation.reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Cargar Póliza</CardTitle>
        <CardDescription>
          Arrastrá el archivo PDF de la póliza para extraer sus datos automáticamente con IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadMutation.isError && (
          <FormError message={getErrorMessage(uploadMutation.error)} />
        )}

        {uploadMutation.isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 space-y-3 border border-green-500/30 rounded-lg bg-green-500/10 text-center">
            <CheckIcon className="w-12 h-12 text-green-500" />
            <div className="font-medium text-green-700 dark:text-green-300">
              ¡Póliza enviada a extracción con éxito!
            </div>
            <div className="text-xs text-muted-foreground break-all">
              Archivo: {uploadMutation.data.filename}
            </div>
            <div className="text-xs text-muted-foreground break-all">
              Key: {uploadMutation.data.policyAssetKey}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="mt-2">
              Subir otra póliza
            </Button>
          </div>
        ) : (
          <>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <FileIcon className="w-10 h-10 text-primary" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <UploadIcon className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Arrastrá tu PDF acá o hacé clic para seleccionar
                  </span>
                  <span className="text-xs text-muted-foreground">Solo archivos .PDF</span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={handleUpload}
            >
              {uploadMutation.isPending ? (
                <>
                  <LoadingIcon className="animate-spin mr-2" />
                  Extrayendo datos de la póliza...
                </>
              ) : (
                'Iniciar Extracción'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
