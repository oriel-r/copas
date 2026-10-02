import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as DocumentUploadCardModule from './document-upload-card'

const DocumentUploadCard =
  (DocumentUploadCardModule as any).DocumentUploadCard ?? (DocumentUploadCardModule as any).default

const mockEnqueueFiles = vi.fn()
const mockClearCompleted = vi.fn()
const mockRetryItem = vi.fn()
let mockItems: any[] = []

vi.mock('../../lib/api/use-documents-upload-queue', () => ({
  useDocumentsUploadQueue: () => ({
    items: mockItems,
    enqueueFiles: mockEnqueueFiles,
    clearCompleted: mockClearCompleted,
    retryItem: mockRetryItem,
  }),
}))

describe('DocumentUploadCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems = []
  })

  describe('Upload Button and File Input', () => {
    it('renders the "Subir documentos" button or label', () => {
      render(<DocumentUploadCard />)

      const uploadTrigger = screen.getByText(/subir documentos/i)
      expect(uploadTrigger).toBeInTheDocument()
    })

    it('renders an <input type="file" multiple accept="application/pdf,.pdf" />', () => {
      const { container } = render(<DocumentUploadCard />)

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).not.toBeNull()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('multiple')

      const acceptValue = fileInput.getAttribute('accept') ?? ''
      expect(acceptValue).toContain('.pdf')
      expect(acceptValue).toContain('application/pdf')
    })

    it('triggers enqueueFiles when files are selected via the file input', () => {
      const { container } = render(<DocumentUploadCard />)

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).not.toBeNull()

      const file1 = new File(['dummy-content-1'], 'poliza_uno.pdf', { type: 'application/pdf' })
      const file2 = new File(['dummy-content-2'], 'poliza_dos.pdf', { type: 'application/pdf' })

      fireEvent.change(fileInput, { target: { files: [file1, file2] } })

      expect(mockEnqueueFiles).toHaveBeenCalledWith([file1, file2])
    })
  })

  describe('Upload Queue Rendering', () => {
    it('renders items in the queue with filename, formatted size, and status states ("Subiendo...", "Subido", "Error")', () => {
      mockItems = [
        {
          id: 'item-1',
          file: new File([new Uint8Array(1.5 * 1024 * 1024)], 'poliza_auto.pdf', {
            type: 'application/pdf',
          }),
          status: 'uploading',
        },
        {
          id: 'item-2',
          file: new File([new Uint8Array(2 * 1024 * 1024)], 'poliza_vida.pdf', {
            type: 'application/pdf',
          }),
          status: 'success',
        },
        {
          id: 'item-3',
          file: new File([new Uint8Array(500 * 1024)], 'foto_auto.png', {
            type: 'image/png',
          }),
          status: 'error',
          error: 'Solo se admiten archivos PDF',
        },
      ]

      render(<DocumentUploadCard />)

      // Filenames
      expect(screen.getByText('poliza_auto.pdf')).toBeInTheDocument()
      expect(screen.getByText('poliza_vida.pdf')).toBeInTheDocument()
      expect(screen.getByText('foto_auto.png')).toBeInTheDocument()

      // Statuses
      expect(screen.getByText(/subiendo/i)).toBeInTheDocument()
      expect(screen.getByText(/subido/i)).toBeInTheDocument()
      expect(screen.getByText(/error/i)).toBeInTheDocument()

      // Error message for failed item
      expect(screen.getByText(/solo se admiten archivos pdf/i)).toBeInTheDocument()

      // Formatted file sizes (e.g., MB or KB)
      expect(screen.getByText(/1\.5\s*mb|1536\s*kb/i)).toBeInTheDocument()
      expect(screen.getByText(/2(?:\.0)?\s*mb|2048\s*kb/i)).toBeInTheDocument()
      expect(screen.getByText(/500\s*kb|0\.49\s*mb/i)).toBeInTheDocument()
    })

    it('renders retry button for failed items and triggers retryItem', () => {
      mockItems = [
        {
          id: 'item-err-1',
          file: new File(['data'], 'poliza_fallida.pdf', { type: 'application/pdf' }),
          status: 'error',
          error: 'Error de red al subir',
        },
      ]

      render(<DocumentUploadCard />)

      const retryBtn = screen.getByRole('button', { name: /reintentar|retry/i })
      expect(retryBtn).toBeInTheDocument()

      fireEvent.click(retryBtn)
      expect(mockRetryItem).toHaveBeenCalledWith('item-err-1')
    })

    it('renders clear completed action when there are successful uploads', () => {
      mockItems = [
        {
          id: 'item-succ-1',
          file: new File(['data'], 'poliza_ok.pdf', { type: 'application/pdf' }),
          status: 'success',
        },
      ]

      render(<DocumentUploadCard />)

      const clearBtn = screen.getByRole('button', { name: /limpiar|borrar|clear/i })
      expect(clearBtn).toBeInTheDocument()

      fireEvent.click(clearBtn)
      expect(mockClearCompleted).toHaveBeenCalledTimes(1)
    })
  })
})
