import { describe, expect, it } from 'vitest'
import { renderHook, act, render, screen } from '@testing-library/react'
import { MemoryRouter, useSearchParams, createMemoryRouter, RouterProvider } from 'react-router'
import * as HookModule from './use-insured-drawer'
import type { UseInsuredDrawerReturn } from './use-insured-drawer'

const useInsuredDrawer: () => UseInsuredDrawerReturn =
  (HookModule as any).useInsuredDrawer ?? (HookModule as any).default

describe('useInsuredDrawer Hook', () => {
  describe('Initial State based on URL Search Parameters', () => {
    it('should return isOpen=false and insuredId=null when insuredId param is not present in URL', () => {
      const { result } = renderHook(() => useInsuredDrawer(), {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={['/cartera']}>
            {children}
          </MemoryRouter>
        ),
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.insuredId).toBeNull()
    })

    it('should return isOpen=true and insuredId from URL when insuredId param is present', () => {
      const targetId = '019213ab-1111-7000-8000-000000000001'
      const { result } = renderHook(() => useInsuredDrawer(), {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[`/cartera?insuredId=${targetId}`]}>
            {children}
          </MemoryRouter>
        ),
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.insuredId).toBe(targetId)
    })

    it('should treat empty insuredId parameter (?insuredId=) as closed', () => {
      const { result } = renderHook(() => useInsuredDrawer(), {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={['/cartera?insuredId=']}>
            {children}
          </MemoryRouter>
        ),
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.insuredId ? result.current.insuredId : null).toBeNull()
    })
  })

  describe('open(id) Behavior and Parameter Preservation', () => {
    it('should update isOpen to true, set insuredId, and append insuredId to search params', () => {
      const { result } = renderHook(
        () => {
          const drawer = useInsuredDrawer()
          const [searchParams] = useSearchParams()
          return { drawer, searchParams }
        },
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={['/cartera']}>
              {children}
            </MemoryRouter>
          ),
        },
      )

      expect(result.current.drawer.isOpen).toBe(false)

      const targetId = '019213ab-2222-7000-8000-000000000002'
      act(() => {
        result.current.drawer.open(targetId)
      })

      expect(result.current.drawer.isOpen).toBe(true)
      expect(result.current.drawer.insuredId).toBe(targetId)
      expect(result.current.searchParams.get('insuredId')).toBe(targetId)
    })

    it('should preserve other existing query parameters when opening the drawer', () => {
      const { result } = renderHook(
        () => {
          const drawer = useInsuredDrawer()
          const [searchParams] = useSearchParams()
          return { drawer, searchParams }
        },
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={['/cartera?status=active&company=sancor&page=2']}>
              {children}
            </MemoryRouter>
          ),
        },
      )

      const targetId = '019213ab-3333-7000-8000-000000000003'
      act(() => {
        result.current.drawer.open(targetId)
      })

      expect(result.current.drawer.isOpen).toBe(true)
      expect(result.current.drawer.insuredId).toBe(targetId)
      expect(result.current.searchParams.get('insuredId')).toBe(targetId)
      expect(result.current.searchParams.get('status')).toBe('active')
      expect(result.current.searchParams.get('company')).toBe('sancor')
      expect(result.current.searchParams.get('page')).toBe('2')
    })

    it('should allow switching between different insuredIds via subsequent open calls', () => {
      const { result } = renderHook(
        () => {
          const drawer = useInsuredDrawer()
          const [searchParams] = useSearchParams()
          return { drawer, searchParams }
        },
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={['/cartera']}>
              {children}
            </MemoryRouter>
          ),
        },
      )

      act(() => {
        result.current.drawer.open('id-first')
      })
      expect(result.current.drawer.insuredId).toBe('id-first')

      act(() => {
        result.current.drawer.open('id-second')
      })
      expect(result.current.drawer.insuredId).toBe('id-second')
      expect(result.current.searchParams.get('insuredId')).toBe('id-second')
    })
  })

  describe('close() Behavior and Parameter Preservation', () => {
    it('should update isOpen to false, set insuredId to null, and remove insuredId from URL', () => {
      const { result } = renderHook(
        () => {
          const drawer = useInsuredDrawer()
          const [searchParams] = useSearchParams()
          return { drawer, searchParams }
        },
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={['/cartera?insuredId=019213ab-4444-7000-8000-000000000004']}>
              {children}
            </MemoryRouter>
          ),
        },
      )

      expect(result.current.drawer.isOpen).toBe(true)
      expect(result.current.drawer.insuredId).toBe('019213ab-4444-7000-8000-000000000004')

      act(() => {
        result.current.drawer.close()
      })

      expect(result.current.drawer.isOpen).toBe(false)
      expect(result.current.drawer.insuredId).toBeNull()
      expect(result.current.searchParams.has('insuredId')).toBe(false)
    })

    it('should preserve other existing query parameters when closing the drawer', () => {
      const { result } = renderHook(
        () => {
          const drawer = useInsuredDrawer()
          const [searchParams] = useSearchParams()
          return { drawer, searchParams }
        },
        {
          wrapper: ({ children }) => (
            <MemoryRouter initialEntries={['/cartera?q=perez&sort=desc&insuredId=target-id']}>
              {children}
            </MemoryRouter>
          ),
        },
      )

      act(() => {
        result.current.drawer.close()
      })

      expect(result.current.drawer.isOpen).toBe(false)
      expect(result.current.drawer.insuredId).toBeNull()
      expect(result.current.searchParams.has('insuredId')).toBe(false)
      expect(result.current.searchParams.get('q')).toBe('perez')
      expect(result.current.searchParams.get('sort')).toBe('desc')
    })
  })

  describe('Browser History Back Navigation (popstate)', () => {
    it('should close the drawer and reset insuredId when navigating back in history', async () => {
      let currentDrawerState: UseInsuredDrawerReturn | null = null

      function ConsumerComponent() {
        currentDrawerState = useInsuredDrawer()
        return (
          <div>
            <span data-testid="is-open">{currentDrawerState.isOpen ? 'open' : 'closed'}</span>
            <span data-testid="insured-id">{currentDrawerState.insuredId ?? 'none'}</span>
          </div>
        )
      }

      const router = createMemoryRouter(
        [
          {
            path: '/cartera',
            element: <ConsumerComponent />,
          },
        ],
        {
          initialEntries: [
            '/cartera?tab=general',
            '/cartera?tab=general&insuredId=target-back-id',
          ],
          initialIndex: 1,
        },
      )

      render(<RouterProvider router={router} />)

      expect(screen.getByTestId('is-open')).toHaveTextContent('open')
      expect(screen.getByTestId('insured-id')).toHaveTextContent('target-back-id')

      await act(async () => {
        await router.navigate(-1)
      })

      expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
      expect(screen.getByTestId('insured-id')).toHaveTextContent('none')
    })
  })
})
