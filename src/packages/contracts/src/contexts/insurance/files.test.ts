import { describe, expect, it } from 'vitest'
import {
  validatePdfMetadata,
  validatePdfMagicBytes,
  MAX_FILE_SIZE_BYTES,
  PDF_MAGIC_BYTES,
  pdfValidationResultSchema,
} from './files'

describe('files contracts - PDF validations', () => {
  describe('validatePdfMetadata', () => {
    describe('Happy Path', () => {
      it('should validate successfully when filename is .pdf, size <= 15MB, and contentType is application/pdf', () => {
        const result = validatePdfMetadata('poliza_auto.pdf', 1024 * 500, 'application/pdf')
        expect(pdfValidationResultSchema.safeParse(result).success).toBe(true)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should accept uppercase .PDF extension', () => {
        const result = validatePdfMetadata('DOCUMENTO_CONTRATO.PDF', 2048, 'application/pdf')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should accept mixed case .Pdf extension', () => {
        const result = validatePdfMetadata('CertificadoCobertura.Pdf', 4096, 'application/pdf')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should validate successfully at the exact boundary of 15MB (MAX_FILE_SIZE_BYTES)', () => {
        const result = validatePdfMetadata('poliza_grande.pdf', MAX_FILE_SIZE_BYTES, 'application/pdf')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should validate successfully when contentType is omitted or undefined if filename and size are valid', () => {
        const result = validatePdfMetadata('documento.pdf', 1024)
        expect(result.valid).toBe(true)
      })
    })

    describe('Filename and Extension Validation', () => {
      it.each([
        ['image.png', 'image'],
        ['foto.jpg', 'image'],
        ['scan.jpeg', 'image'],
        ['grabacion.mp3', 'audio'],
        ['audio.wav', 'audio'],
        ['video_inspeccion.mp4', 'video'],
        ['video.mov', 'video'],
        ['poliza.docx', 'word document'],
        ['planilla.xlsx', 'excel sheet'],
        ['archivo.txt', 'text file'],
        ['sin_extension', 'no extension'],
        ['.pdf', 'dot pdf without name'],
      ])('should return valid: false when filename is %s (%s)', (filename) => {
        const result = validatePdfMetadata(filename, 1024, 'application/pdf')
        expect(pdfValidationResultSchema.safeParse(result).success).toBe(true)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      })
    })

    describe('File Size Boundary Validation', () => {
      it('should return valid: false when size exceeds 15MB by 1 byte', () => {
        const result = validatePdfMetadata('poliza.pdf', MAX_FILE_SIZE_BYTES + 1, 'application/pdf')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false when size is significantly larger than 15MB', () => {
        const result = validatePdfMetadata('archivo_gigante.pdf', 25 * 1024 * 1024, 'application/pdf')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false when size is negative', () => {
        const result = validatePdfMetadata('archivo.pdf', -1, 'application/pdf')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('MIME Content-Type Validation', () => {
      it.each([
        'image/png',
        'image/jpeg',
        'video/mp4',
        'audio/mpeg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
        'text/plain',
      ])('should return valid: false when contentType is %s', (invalidContentType) => {
        const result = validatePdfMetadata('poliza.pdf', 1024, invalidContentType)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validatePdfMagicBytes', () => {
    describe('Happy Path', () => {
      it('should validate successfully when buffer starts with exact PDF magic bytes (%PDF-)', () => {
        const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]) // %PDF-1.4
        const result = validatePdfMagicBytes(buffer)
        expect(pdfValidationResultSchema.safeParse(result).success).toBe(true)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should validate successfully when passing an ArrayBuffer', () => {
        const uint8 = new Uint8Array(PDF_MAGIC_BYTES)
        const result = validatePdfMagicBytes(uint8.buffer)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should validate successfully with standard TextEncoder encoded %PDF- prefix', () => {
        const encoded = new TextEncoder().encode('%PDF-1.7\n%\xaa\xbb\xcc\xdd\n...')
        const result = validatePdfMagicBytes(encoded)
        expect(result.valid).toBe(true)
      })
    })

    describe('Invalid Magic Bytes / Formats', () => {
      it('should return valid: false for PNG header', () => {
        const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
        const result = validatePdfMagicBytes(pngHeader)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false for JPEG header', () => {
        const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46])
        const result = validatePdfMagicBytes(jpegHeader)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false for empty buffer', () => {
        const empty = new Uint8Array(0)
        const result = validatePdfMagicBytes(empty)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false for truncated buffer with fewer than 5 bytes', () => {
        const truncated = new Uint8Array([0x25, 0x50, 0x44]) // only %PD
        const result = validatePdfMagicBytes(truncated)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false for arbitrary text', () => {
        const textBuffer = new TextEncoder().encode('Hello world this is not a PDF file')
        const result = validatePdfMagicBytes(textBuffer)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should return valid: false for near-miss signature (%PDX-)', () => {
        const nearMiss = new Uint8Array([0x25, 0x50, 0x44, 0x58, 0x2D])
        const result = validatePdfMagicBytes(nearMiss)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })
})
