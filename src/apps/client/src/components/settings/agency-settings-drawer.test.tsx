import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { OrganizationWhatsAppEndpoint } from '@copas/contracts'
import {
  AGENCY_SETTINGS_DRAWER_ID,
  AgencySettingsDrawer,
  AgencySettingsTrigger,
  buildQrRequestWhatsAppUrl,
  validateAgencyPhone,
} from '@/components/settings'
import { useAgencySettingsStore } from '@/stores/use-agency-settings-store'
import { AppShell } from '@/components/layout/app-shell'
import { useSession, useSessionStore } from '@/lib/session'
import { authClient } from '@/lib/auth-client'

const apiMocks = vi.hoisted(() => ({
  getWhatsAppEndpoint: vi.fn(),
  putWhatsAppEndpoint: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    'channel-endpoints': {
      whatsapp: {
        $get: apiMocks.getWhatsAppEndpoint,
        $put: apiMocks.putWhatsAppEndpoint,
      },
    },
  },
}))

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return {
    ...actual,
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
})

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useListOrganizations: vi.fn(),
    useActiveOrganization: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

describe('Agency Settings Helpers', () => {
  describe('validateAgencyPhone', () => {
    it.each([
      '+54 9 11 1234-5678',
      '123456',
      '+123456',
      '(011) 4321-5678',
      '+1 (555) 123-4567',
      '12345678901234567890',
      '+12345678901234567890',
      '  +54 9 11 1234-5678  ',
    ])('accepts valid phone number %s', (phone) => {
      const result = validateAgencyPhone(phone)
      expect(result).toBeNull()
    })

    it.each([
      ['empty string', ''],
      ['whitespace only', '    '],
    ])('rejects blank phone (%s) with required message', (_label, phone) => {
      const result = validateAgencyPhone(phone)
      expect(result).toBe('Ingresá el número de teléfono de la agencia')
    })

    it.each([
      ['plus sign only', '+'],
      ['too short (5 digits)', '12345'],
      ['too short with plus (+ and 5 digits)', '+12345'],
      ['too long (21 digits)', '123456789012345678901'],
      ['too long with plus (+ and 21 digits)', '+123456789012345678901'],
      ['contains letters', 'abc123456'],
      ['contains invalid punctuation', '+54 11 #1234-5678'],
    ])('rejects invalid phone (%s) with format message', (_label, phone) => {
      const result = validateAgencyPhone(phone)
      expect(result).toBe('Ingresá un teléfono válido (ej: +54 9 11 1234-5678)')
    })
  })

  describe('buildQrRequestWhatsAppUrl', () => {
    it('builds WhatsApp URL with agencyName when provided', () => {
      const url = buildQrRequestWhatsAppUrl('+54 9 11 1234-5678', 'Seguros Del Sur')
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://wa.me')
      expect(parsed.pathname).toBe('/543718446327')
      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678) de la agencia Seguros Del Sur, pasame el link para vincular',
      )
    })

    it('builds WhatsApp URL without agencyName when omitted', () => {
      const url = buildQrRequestWhatsAppUrl('+54 9 11 1234-5678')
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://wa.me')
      expect(parsed.pathname).toBe('/543718446327')
      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678), pasame el link para vincular',
      )
    })

    it('omits agency phrase when agencyName is empty or whitespace', () => {
      const url = buildQrRequestWhatsAppUrl('+54 9 11 1234-5678', '   ')
      const parsed = new URL(url)

      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678), pasame el link para vincular',
      )
    })
    it('encodes special characters in agencyName safely', () => {
      const url = buildQrRequestWhatsAppUrl('+54 9 11 1234-5678', 'San Martín & Cía')
      const parsed = new URL(url)

      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678) de la agencia San Martín & Cía, pasame el link para vincular',
      )
    })
  })
})

describe('AgencySettingsTrigger & AgencySettingsDrawer', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    useAgencySettingsStore.getState().reset()
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAgencySettingsStore.getState().reset()
  })

  describe('AgencySettingsTrigger', () => {
    it('renders button with accessible name, aria-controls, and aria-expanded reflecting closed state', () => {
      render(<AgencySettingsTrigger />)

      const trigger = screen.getByRole('button', { name: 'Abrir ajustes de la agencia' })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-controls', AGENCY_SETTINGS_DRAWER_ID)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('opens the drawer on click and updates aria-expanded to true', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsTrigger />)

      const trigger = screen.getByRole('button', { name: 'Abrir ajustes de la agencia' })
      await user.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('calls onOpen prop when provided', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      render(<AgencySettingsTrigger onOpen={onOpen} />)

      const trigger = screen.getByRole('button', { name: 'Abrir ajustes de la agencia' })
      await user.click(trigger)

      expect(onOpen).toHaveBeenCalledOnce()
    })
  })

  describe('AgencySettingsDrawer visibility and structure', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<AgencySettingsDrawer isOpen={false} />)

      expect(container.firstChild).toBeNull()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders a dialog labeled by "Ajustes de la agencia" with expected controls when open', () => {
      render(
        <AgencySettingsDrawer
          isOpen={true}
          organizationId="org-1"
          agencyName="Seguros Del Sur"
        />,
      )

      const dialog = screen.getByRole('dialog', { name: 'Ajustes de la agencia' })
      expect(dialog).toBeInTheDocument()
      expect(dialog.tagName).toBe('DIALOG')

      expect(screen.getByRole('heading', { name: 'Ajustes de la agencia' })).toBeInTheDocument()
      expect(screen.getByText(/Seguros Del Sur/)).toBeInTheDocument()
      expect(screen.getByText('Sin configurar')).toBeInTheDocument()

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'tel')
      expect(input).toBeRequired()
      expect(input).toHaveAttribute('placeholder', '+54 9 11 1234-5678')

      expect(screen.getByRole('button', { name: 'Guardar número' })).toBeInTheDocument()

      const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })
      expect(qrButton).toBeInTheDocument()
      expect(qrButton).toBeDisabled()

      expect(screen.getByRole('button', { name: 'Cerrar ajustes de la agencia' })).toBeInTheDocument()
    })

    it('renders cleanly without agencyName', () => {
      render(<AgencySettingsDrawer isOpen={true} />)

      expect(screen.getByRole('dialog', { name: 'Ajustes de la agencia' })).toBeInTheDocument()
      expect(screen.getByText('Sin configurar')).toBeInTheDocument()
    })
  })

  describe('Phone validation and error handling', () => {
    it('shows alert, focuses input, does not save, and keeps Solicitar QR disabled when submitting empty phone', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsDrawer isOpen={true} agencyName="Agencia Test" />)

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      const saveButton = screen.getByRole('button', { name: 'Guardar número' })
      const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })

      await user.click(saveButton)
      // Fallback submit in case native required constraint blocks click in DOM env
      if (!screen.queryByRole('alert')) {
        fireEvent.submit(input.closest('form')!)
      }

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(input).toHaveFocus()
      expect(screen.getByText('Sin configurar')).toBeInTheDocument()
      expect(qrButton).toBeDisabled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it.each(['123', 'abc', '12345', '123456789012345678901', '+54-11-inv@lid'])(
      'shows alert, focuses input, and prevents saving for invalid phone %s',
      async (invalidPhone) => {
        const user = userEvent.setup()
        render(<AgencySettingsDrawer isOpen={true} agencyName="Agencia Test" />)

        const input = screen.getByLabelText(/Teléfono de la agencia/i)
        const saveButton = screen.getByRole('button', { name: 'Guardar número' })
        const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })

        await user.type(input, invalidPhone)
        await user.click(saveButton)

        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(input).toHaveFocus()
        expect(screen.getByText('Sin configurar')).toBeInTheDocument()
        expect(qrButton).toBeDisabled()
        expect(consoleLogSpy).not.toHaveBeenCalled()
      },
    )
  })

  describe('Saving phone, dirty state, and Solicitar QR flow', () => {
    it('saves a valid phone to store, logs to console, updates badge to "Número cargado", and enables Solicitar QR', async () => {
      const user = userEvent.setup()
      render(
        <AgencySettingsDrawer
          isOpen={true}
          organizationId="org-123"
          agencyName="Seguros Norte"
        />,
      )

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      const saveButton = screen.getByRole('button', { name: 'Guardar número' })
      const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })

      await user.type(input, '+54 9 11 1234-5678')
      await user.click(saveButton)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('Número cargado')).toBeInTheDocument()
      expect(screen.queryByText('Sin configurar')).not.toBeInTheDocument()
      expect(qrButton).toBeEnabled()
      expect(consoleLogSpy).toHaveBeenCalled()

      const storeState = useAgencySettingsStore.getState() as unknown as Record<string, unknown>
      expect(JSON.stringify(storeState)).toContain('+54 9 11 1234-5678')
    })

    it('disables Solicitar QR when input is modified after saving until saved again', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsDrawer isOpen={true} agencyName="Seguros Norte" />)

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      const saveButton = screen.getByRole('button', { name: 'Guardar número' })
      const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })

      await user.type(input, '+54 9 11 1234-5678')
      await user.click(saveButton)
      expect(qrButton).toBeEnabled()

      await user.type(input, '9')
      expect(qrButton).toBeDisabled()

      await user.click(saveButton)
      expect(qrButton).toBeEnabled()
    })

    it('opens WhatsApp URL with agencyName when clicking Solicitar QR', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsDrawer isOpen={true} agencyName="Seguros Norte" />)

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      await user.type(input, '+54 9 11 1234-5678')
      await user.click(screen.getByRole('button', { name: 'Guardar número' }))

      await user.click(screen.getByRole('button', { name: 'Solicitar QR' }))

      expect(windowOpenSpy).toHaveBeenCalledOnce()
      const [openedUrl, target, features] = windowOpenSpy.mock.calls[0]
      expect(target).toBe('_blank')
      expect(features).toBe('noopener,noreferrer')

      const parsed = new URL(String(openedUrl))
      expect(parsed.origin).toBe('https://wa.me')
      expect(parsed.pathname).toBe('/543718446327')
      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678) de la agencia Seguros Norte, pasame el link para vincular',
      )
    })

    it('opens WhatsApp URL without agencyName when agencyName is not provided', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsDrawer isOpen={true} />)

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      await user.type(input, '+54 9 11 1234-5678')
      await user.click(screen.getByRole('button', { name: 'Guardar número' }))

      await user.click(screen.getByRole('button', { name: 'Solicitar QR' }))

      expect(windowOpenSpy).toHaveBeenCalledOnce()
      const [openedUrl, target, features] = windowOpenSpy.mock.calls[0]
      expect(target).toBe('_blank')
      expect(features).toBe('noopener,noreferrer')

      const parsed = new URL(String(openedUrl))
      expect(parsed.searchParams.get('text')).toBe(
        'Hola, ya cargué el número (+54 9 11 1234-5678), pasame el link para vincular',
      )
    })
  })

  describe('Closing and Trigger/Drawer coordination', () => {
    it('calls onClose when clicking the close button', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<AgencySettingsDrawer isOpen={true} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: 'Cerrar ajustes de la agencia' }))

      expect(onClose).toHaveBeenCalledOnce()
    })

    it('opens and closes drawer via store when Trigger and Drawer are composed together', async () => {
      const user = userEvent.setup()
      render(
        <>
          <AgencySettingsTrigger />
          <AgencySettingsDrawer agencyName="Mi Agencia" />
        </>,
      )

      const trigger = screen.getByRole('button', { name: 'Abrir ajustes de la agencia' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const dialog = screen.getByRole('dialog', { name: 'Ajustes de la agencia' })
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('id', AGENCY_SETTINGS_DRAWER_ID)

      await user.click(screen.getByRole('button', { name: 'Cerrar ajustes de la agencia' }))

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        },
        { timeout: 1000 },
      )
    })

    it('clears previous validation alert once a valid phone is submitted', async () => {
      const user = userEvent.setup()
      render(<AgencySettingsDrawer isOpen={true} agencyName="Mi Agencia" />)

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      const saveButton = screen.getByRole('button', { name: 'Guardar número' })

      await user.type(input, '123')
      await user.click(saveButton)
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.clear(input)
      await user.type(input, '+54 9 11 1234-5678')
      await user.click(saveButton)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('Número cargado')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Solicitar QR' })).toBeEnabled()
    })

    it('retains saved phone state across drawer close and reopen', async () => {
      const user = userEvent.setup()
      render(
        <>
          <AgencySettingsTrigger />
          <AgencySettingsDrawer organizationId="org-persist" agencyName="Mi Agencia" />
        </>,
      )

      await user.click(screen.getByRole('button', { name: 'Abrir ajustes de la agencia' }))
      await user.type(screen.getByLabelText(/Teléfono de la agencia/i), '+54 9 11 5555-0000')
      await user.click(screen.getByRole('button', { name: 'Guardar número' }))
      expect(screen.getByText('Número cargado')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cerrar ajustes de la agencia' }))
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        },
        { timeout: 1000 },
      )

      await user.click(screen.getByRole('button', { name: 'Abrir ajustes de la agencia' }))
      expect(screen.getByText('Número cargado')).toBeInTheDocument()
      expect(screen.getByLabelText(/Teléfono de la agencia/i)).toHaveValue('+54 9 11 5555-0000')
      expect(screen.getByRole('button', { name: 'Solicitar QR' })).toBeEnabled()
    })
  })
})

describe('AppShell AgencySettingsTrigger integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAgencySettingsStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAgencySettingsStore.getState().reset()
  })

  function mockAuthState({
    authenticated = true,
    orgs = [{ id: 'org-1', name: 'Agencia Alfa', slug: 'agencia-alfa' }],
    activeOrg = { id: 'org-1', name: 'Agencia Alfa', slug: 'agencia-alfa' } as {
      id: string
      name: string
      slug: string
    } | null,
  } = {}) {
    vi.mocked(useSession).mockReturnValue({
      data: authenticated ? { user: { id: 'user-1', name: 'PAS User' }, session: { id: 'sess-1' } } : null,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useSession>)
    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: orgs,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>)
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: activeOrg,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>)
  }

  function renderAppShellAt(route: string) {
    const queryClient = createQueryClient()
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<div>Dashboard Content</div>} />
              <Route path="/cartera" element={<div>Cartera Content</div>} />
              <Route path="/onboarding" element={<div>Onboarding Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('shows AgencySettingsTrigger when authenticated with an organization on /dashboard', () => {
    mockAuthState()
    renderAppShellAt('/dashboard')

    expect(
      screen.getByRole('button', { name: 'Abrir ajustes de la agencia' }),
    ).toBeInTheDocument()
  })

  it('shows AgencySettingsTrigger on /cartera and opens the drawer with organization name on click', async () => {
    const user = userEvent.setup()
    mockAuthState()
    renderAppShellAt('/cartera')

    const trigger = screen.getByRole('button', { name: 'Abrir ajustes de la agencia' })
    expect(trigger).toBeInTheDocument()

    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Ajustes de la agencia' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/Agencia Alfa/)).toBeInTheDocument()
  })

  it('shows AgencySettingsTrigger using useListOrganizations fallback when useActiveOrganization is null', () => {
    mockAuthState({ activeOrg: null })
    renderAppShellAt('/dashboard')

    expect(
      screen.getByRole('button', { name: 'Abrir ajustes de la agencia' }),
    ).toBeInTheDocument()
  })

  it('hides AgencySettingsTrigger on /onboarding even when authenticated', () => {
    mockAuthState()
    renderAppShellAt('/onboarding')

    expect(
      screen.queryByRole('button', { name: 'Abrir ajustes de la agencia' }),
    ).not.toBeInTheDocument()
  })

  it('hides AgencySettingsTrigger when session is missing', () => {
    mockAuthState({ authenticated: false })
    renderAppShellAt('/dashboard')

    expect(
      screen.queryByRole('button', { name: 'Abrir ajustes de la agencia' }),
    ).not.toBeInTheDocument()
  })

  it('hides AgencySettingsTrigger when active organization and organization list are missing', () => {
    mockAuthState({ orgs: [], activeOrg: null })
    renderAppShellAt('/dashboard')

    expect(
      screen.queryByRole('button', { name: 'Abrir ajustes de la agencia' }),
    ).not.toBeInTheDocument()
  })
})

describe('AgencySettingsDrawer granular connection states (online mode)', () => {
  function setOnlineSession(organizationId = 'org-1') {
    useSessionStore.setState({
      status: 'online',
      demoSession: null,
      realSession: {
        data: {
          user: { id: 'usr-1', email: 'pas@example.com' },
          session: { id: 'ses-1', activeOrganizationId: organizationId },
        },
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useSession>,
    })
  }

  function makeEndpoint(
    overrides: Partial<OrganizationWhatsAppEndpoint> = {},
  ): OrganizationWhatsAppEndpoint {
    return {
      endpointId: 'cep-org-1',
      organizationChannelEndpointId: 'oce-org-1',
      organizationId: 'org-1',
      number: '+54 9 11 2222-3333',
      provider: 'whatsapp_cloud',
      ownerKind: 'organization',
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: null,
      ...overrides,
    }
  }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAgencySettingsStore.getState().reset()
    setOnlineSession('org-1')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAgencySettingsStore.getState().reset()
    useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
  })

  it('renders connected state with "Conectado" badge, "WhatsApp conectado" card, and "Solicitar nuevo QR" button', async () => {
    const endpoint = makeEndpoint({
      status: 'active',
      linkingStatus: 'active',
      connectionStatus: 'connected',
    })
    apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Conectada" />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument()
    })
    expect(screen.getByText('WhatsApp conectado')).toBeInTheDocument()

    const newQrButton = screen.getByRole('button', { name: 'Solicitar nuevo QR' })
    expect(newQrButton).toBeInTheDocument()
    expect(newQrButton).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Solicitar QR' })).not.toBeInTheDocument()
  })

  it('renders waiting_qr state with "Esperando QR" badge, "Esperando escaneo de QR" card, and prominent "Solicitar QR" button', async () => {
    const endpoint = makeEndpoint({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'waiting_qr',
    })
    apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Esperando" />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Esperando QR')).toBeInTheDocument()
    })
    expect(screen.getByText('Esperando escaneo de QR')).toBeInTheDocument()

    const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })
    expect(qrButton).toBeInTheDocument()
    expect(qrButton).toBeEnabled()
  })

  it('renders disconnected state with "Desconectado" badge and "Sesión desconectada" card', async () => {
    const endpoint = makeEndpoint({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'disconnected',
    })
    apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AgencySettingsDrawer
          isOpen={true}
          organizationId="org-1"
          agencyName="Agencia Desconectada"
        />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Desconectado')).toBeInTheDocument()
    })
    expect(screen.getByText('Sesión desconectada')).toBeInTheDocument()
  })

  it('renders error state with "Error de conexión" badge and "Error en la vinculación" card', async () => {
    const endpoint = makeEndpoint({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'error',
    })
    apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Error" />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Error de conexión')).toBeInTheDocument()
    })
    expect(screen.getByText('Error en la vinculación')).toBeInTheDocument()
  })

  it('triggers a manual refetch when clicking "Actualizar" in online mode', async () => {
    const user = userEvent.setup()
    const waitingEndpoint = makeEndpoint({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'waiting_qr',
    })
    const connectedEndpoint = makeEndpoint({
      status: 'active',
      linkingStatus: 'active',
      connectionStatus: 'connected',
    })

    apiMocks.getWhatsAppEndpoint
      .mockResolvedValueOnce(jsonResponse({ endpoint: waitingEndpoint }))
      .mockResolvedValueOnce(jsonResponse({ endpoint: connectedEndpoint }))

    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Refresh" />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Esperando QR')).toBeInTheDocument()
    })
    expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalledTimes(1)

    const refreshButton = screen.getByRole('button', { name: /Actualizar/i })
    await user.click(refreshButton)

    await waitFor(() => {
      expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Conectado')).toBeInTheDocument()
    })
    expect(screen.getByText('WhatsApp conectado')).toBeInTheDocument()
  })
})
