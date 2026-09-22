import React, { useState } from 'react'
import type { InsuredDetailResponse, UpdateInsuredRequest } from '@copas/contracts'
import { Card, CardHeader, CardTitle, CardContent, Button, Alert } from '@copas/ui'

export interface InsuredProfileCardProps {
  insured: InsuredDetailResponse
  onUpdate?: (data: UpdateInsuredRequest) => Promise<void> | void
  isUpdating?: boolean
  error?: Error | null
}

export const InsuredProfileCard: React.FC<InsuredProfileCardProps> = ({
  insured,
  onUpdate,
  isUpdating = false,
  error = null,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: insured.fullName || '',
    cuit: insured.cuit || '',
    phone: insured.phone || '',
    email: insured.email || '',
    birthDate: insured.birthDate || '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleEditClick = () => {
    setFormData({
      fullName: insured.fullName || '',
      cuit: insured.cuit || '',
      phone: insured.phone || '',
      email: insured.email || '',
      birthDate: insured.birthDate || '',
    })
    setFieldErrors({})
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setIsEditing(false)
    setFieldErrors({})
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!formData.fullName.trim()) {
      errors.fullName = 'El nombre completo es requerido'
    }
    if (formData.cuit) {
      const cleanCuit = formData.cuit.replace(/\D/g, '')
      if (cleanCuit.length !== 11) {
        errors.cuit = 'El CUIT debe contener 11 dígitos'
      }
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El formato de email no es válido'
    }
    if (formData.birthDate) {
      const today = new Date().toISOString().split('T')[0]
      if (formData.birthDate > today) {
        errors.birthDate = 'La fecha de nacimiento no puede ser futura'
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (onUpdate) {
      try {
        const cleanCuit = formData.cuit ? formData.cuit.replace(/\D/g, '') : ''
        const formattedCuit = cleanCuit.length === 11
          ? `${cleanCuit.slice(0, 2)}-${cleanCuit.slice(2, 10)}-${cleanCuit.slice(10)}`
          : (formData.cuit ? formData.cuit.trim() : undefined)

        await onUpdate({
          fullName: formData.fullName.trim(),
          cuit: formattedCuit,
          phone: formData.phone?.trim() ? formData.phone.trim() : null,
          email: formData.email?.trim() ? formData.email.trim() : null,
          birthDate: formData.birthDate || null,
        })
        setIsEditing(false)
      } catch {
        // error is handled via prop
      }
    }
  }

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Datos de Contacto y Fiscal
        </CardTitle>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEditClick}>
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {error && (
          <div className="mb-3">
            <Alert variant="destructive">{error.message || 'Error al actualizar asegurado'}</Alert>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium text-foreground mb-1">
                Nombre Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-1.5 text-sm rounded border bg-background text-foreground ${
                  fieldErrors.fullName ? 'border-destructive focus:ring-destructive' : 'border-input'
                }`}
              />
              {fieldErrors.fullName && (
                <span className="text-xs text-destructive mt-0.5 block">{fieldErrors.fullName}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cuit" className="block text-xs font-medium text-foreground mb-1">
                  CUIT
                </label>
                <input
                  id="cuit"
                  name="cuit"
                  type="text"
                  value={formData.cuit}
                  onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  className={`w-full px-3 py-1.5 text-sm rounded border bg-background text-foreground ${
                    fieldErrors.cuit || (error && error.message.includes('CUIT'))
                      ? 'border-destructive focus:ring-destructive'
                      : 'border-input'
                  }`}
                />
                {fieldErrors.cuit && (
                  <span className="text-xs text-destructive mt-0.5 block">{fieldErrors.cuit}</span>
                )}
                {error && error.message.includes('CUIT') && !fieldErrors.cuit && (
                  <span className="text-xs text-destructive mt-0.5 block">{error.message}</span>
                )}
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-xs font-medium text-foreground mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className={`w-full px-3 py-1.5 text-sm rounded border bg-background text-foreground ${
                    fieldErrors.birthDate ? 'border-destructive' : 'border-input'
                  }`}
                />
                {fieldErrors.birthDate && (
                  <span className="text-xs text-destructive mt-0.5 block">{fieldErrors.birthDate}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-foreground mb-1">
                  Teléfono
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-1.5 text-sm rounded border bg-background text-foreground ${
                    fieldErrors.email ? 'border-destructive' : 'border-input'
                  }`}
                />
                {fieldErrors.email && (
                  <span className="text-xs text-destructive mt-0.5 block">{fieldErrors.email}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelClick} disabled={isUpdating}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block">CUIT</span>
              <span className="font-medium text-foreground">{insured.cuit || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Fecha de Nacimiento</span>
              <span className="font-medium text-foreground">{insured.birthDate || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Teléfono</span>
              <span className="font-medium text-foreground">{insured.phone || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Email</span>
              <span className="font-medium text-foreground">{insured.email || '-'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
