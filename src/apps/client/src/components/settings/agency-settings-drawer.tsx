import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@copas/ui'
import CloseIcon from '~icons/material-symbols/close'
import QrCodeIcon from '~icons/material-symbols/qr-code-2'
import WhatsAppIcon from '~icons/logos/whatsapp-icon'
import { toast } from '@/lib/toast'
import { useAgencySettingsStore } from '@/stores/use-agency-settings-store'
import { AGENCY_SETTINGS_DRAWER_ID } from './agency-settings-trigger'
import {
  ARGENTINA_MOBILE_PREFIX,
  buildQrRequestWhatsAppUrl,
  formatAgencyPhoneInput,
  validateAgencyPhone,
} from './whatsapp-link'

export interface AgencySettingsDrawerProps {
  isOpen?: boolean
  onClose?: () => void
  organizationId?: string | null
  agencyName?: string | null
}

const EXIT_ANIMATION_MS = 250

export const AgencySettingsDrawer: React.FC<AgencySettingsDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  organizationId = null,
  agencyName = null,
}) => {
  const storeIsOpen = useAgencySettingsStore((s) => s.isOpen)
  const storeClose = useAgencySettingsStore((s) => s.close)

  const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen
  const handleClose = propOnClose ?? storeClose

  const [prevIsOpen, setPrevIsOpen] = useState(isDrawerOpen)
  const [isClosing, setIsClosing] = useState(false)

  if (isDrawerOpen !== prevIsOpen) {
    setPrevIsOpen(isDrawerOpen)
    setIsClosing(!isDrawerOpen)
  }

  useEffect(() => {
    if (!isClosing) return
    const timer = setTimeout(() => {
      setIsClosing(false)
    }, EXIT_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [isClosing])

  const isVisible = isDrawerOpen || isClosing
  if (!isVisible) {
    return null
  }

  return (
    <AgencySettingsDrawerContent
      onRequestClose={handleClose}
      isExiting={!isDrawerOpen && isClosing}
      organizationId={organizationId}
      agencyName={agencyName}
    />
  )
}

interface AgencySettingsDrawerContentProps {
  onRequestClose: () => void
  isExiting: boolean
  organizationId: string | null
  agencyName: string | null
}

const AgencySettingsDrawerContent: React.FC<AgencySettingsDrawerContentProps> = ({
  onRequestClose,
  isExiting,
  organizationId,
  agencyName,
}) => {
  const savedPhone = useAgencySettingsStore((s) => s.agencyPhone)
  const saveAgencyPhone = useAgencySettingsStore((s) => s.saveAgencyPhone)

  const [prevSavedPhone, setPrevSavedPhone] = useState(savedPhone)
  const [phoneInput, setPhoneInput] = useState(savedPhone ?? '')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [hasEdited, setHasEdited] = useState(false)

  if (savedPhone !== prevSavedPhone) {
    setPrevSavedPhone(savedPhone)
    setPhoneInput(savedPhone ?? '')
    setFieldError(null)
    setHasEdited(false)
  }

  const dialogRef = useRef<HTMLDialogElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pressedOutsideRef = useRef(false)

  const titleId = useId()
  const phoneInputId = useId()
  const phoneHelpId = useId()
  const phoneErrorId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    }
  }, [])

  const isPointerOutsideSheet = useCallback((clientX: number, clientY: number) => {
    const sheet = sheetRef.current
    if (!sheet) return false
    const rect = sheet.getBoundingClientRect()
    return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom
  }, [])

  const handleDialogPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (isExiting) return
    pressedOutsideRef.current = isPointerOutsideSheet(e.clientX, e.clientY)
  }

  const handleDialogPointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (isExiting) return
    if (pressedOutsideRef.current && isPointerOutsideSheet(e.clientX, e.clientY)) {
      onRequestClose()
    }
    pressedOutsideRef.current = false
  }

  const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault()
    if (!isExiting) {
      onRequestClose()
    }
  }

  const handleDialogClose = () => {
    if (dialogRef.current?.open) return
    onRequestClose()
  }

  const handlePhoneFocus = () => {
    if (!phoneInput) {
      setPhoneInput(ARGENTINA_MOBILE_PREFIX)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = formatAgencyPhoneInput(e.target.value, phoneInput)
    setPhoneInput(nextValue)

    const hasLocalPart = nextValue.trim() !== '+54 9' && nextValue.trim() !== ''
    if (hasLocalPart) {
      setHasEdited(true)
    }

    if (fieldError && !validateAgencyPhone(nextValue)) {
      setFieldError(null)
    }
  }

  const handlePhoneBlur = () => {
    if (phoneInput.trim() === '+54 9') {
      setPhoneInput('')
      if (!hasEdited) return
    }
    if (!hasEdited) return
    setFieldError(validateAgencyPhone(phoneInput))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validationError = validateAgencyPhone(phoneInput)
    if (validationError) {
      setFieldError(validationError)
      inputRef.current?.focus()
      return
    }

    setFieldError(null)
    setHasEdited(false)
    saveAgencyPhone(phoneInput, { organizationId, agencyName })
    toast.success('Número de agencia guardado', {
      description: 'Ya podés solicitar el QR de vinculación por WhatsApp.',
    })
  }

  const trimmedInput = phoneInput.trim()
  const hasUnsavedChanges = Boolean(savedPhone) && trimmedInput !== savedPhone
  const canRequestQr = Boolean(savedPhone) && !hasUnsavedChanges

  const handleRequestQr = () => {
    if (!savedPhone || hasUnsavedChanges) return
    const url = buildQrRequestWhatsAppUrl(savedPhone, agencyName)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const describedBy = fieldError ? `${phoneHelpId} ${phoneErrorId}` : phoneHelpId

  return (
    <dialog
      ref={dialogRef}
      id={AGENCY_SETTINGS_DRAWER_ID}
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      className={`fixed inset-0 m-0 p-0 w-screen h-dvh max-w-none max-h-none bg-transparent border-0 overflow-hidden backdrop:bg-background/80 backdrop:backdrop-blur-xs ${
        isExiting ? 'pointer-events-none backdrop:animate-out backdrop:fade-out backdrop:duration-200' : 'backdrop:animate-in backdrop:fade-in backdrop:duration-200'
      }`}
    >
      <div
        ref={sheetRef}
        className={`w-full max-w-md h-full bg-card text-card-foreground border-r border-border shadow-2xl flex flex-col overflow-hidden ${
          isExiting
            ? 'animate-out slide-out-to-left duration-250 ease-in fill-mode-forwards pointer-events-none'
            : 'animate-in slide-in-from-left duration-300 ease-out'
        }`}
      >
        <header className="flex items-start justify-between gap-3 p-4 border-b border-border bg-card shrink-0">
          <div className="space-y-1 min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-foreground leading-tight">
              Ajustes de la agencia
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {agencyName && (
                <span className="text-xs text-muted-foreground truncate">
                  {agencyName}
                </span>
              )}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  savedPhone
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {savedPhone ? 'Número cargado' : 'Sin configurar'}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRequestClose}
            aria-label="Cerrar ajustes de la agencia"
            className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 cursor-pointer"
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">WhatsApp de la agencia</CardTitle>
              <CardDescription className="text-xs">
                Configurá el número desde el cual se enviarán las comunicaciones y recordatorios.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor={phoneInputId}
                    className="block text-sm font-medium text-foreground"
                  >
                    Teléfono de la agencia <span aria-hidden="true" className="text-destructive">*</span>
                  </label>
                  <input
                    ref={inputRef}
                    id={phoneInputId}
                    name="agencyPhone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    enterKeyHint="done"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    autoFocus
                    value={phoneInput}
                    onFocus={handlePhoneFocus}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={describedBy}
                    placeholder="+54 9 11 1234-5678"
                    className={`w-full min-h-11 px-3 py-2 text-base sm:text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      fieldError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                    }`}
                  />
                  <p id={phoneHelpId} className="text-xs text-muted-foreground">
                    El prefijo +54 9 se agrega automáticamente. Ingresá código de área y número (ej: 11 1234-5678).
                  </p>
                  {fieldError && (
                    <p
                      id={phoneErrorId}
                      role="alert"
                      aria-live="polite"
                      className="text-xs font-medium text-destructive"
                    >
                      {fieldError}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full min-h-11 cursor-pointer">
                  Guardar número
                </Button>
              </form>

              <div className="pt-3 border-t border-border space-y-2.5">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vinculación por QR
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {hasUnsavedChanges
                      ? 'Guardá los cambios del número antes de solicitar el link de vinculación.'
                      : savedPhone
                        ? 'Listo. Solicitá por WhatsApp el link para vincular este número.'
                        : 'Guardá primero el número de la agencia para habilitar la solicitud de QR.'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestQr}
                  disabled={!canRequestQr}
                  className="w-full min-h-11 gap-2 cursor-pointer"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <QrCodeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Solicitar QR</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </dialog>
  )
}
