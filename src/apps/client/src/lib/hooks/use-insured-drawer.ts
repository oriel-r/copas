import { useSearchParams } from 'react-router'
import { useCallback } from 'react'

export interface UseInsuredDrawerReturn {
  isOpen: boolean
  insuredId: string | null
  open: (id: string) => void
  close: () => void
}

/**
 * Hook to synchronize the Insured Detail Drawer with the URL query parameter (?insuredId=<id>).
 * Preserves existing search params while updating or removing insuredId.
 */
export function useInsuredDrawer(): UseInsuredDrawerReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const insuredId = searchParams.get('insuredId')
  const isOpen = Boolean(insuredId)

  const open = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('insuredId', id)
          return next
        },
        { replace: false }
      )
    },
    [setSearchParams]
  )

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('insuredId')
        return next
      },
      { replace: false }
    )
  }, [setSearchParams])

  return {
    isOpen,
    insuredId,
    open,
    close,
  }
}
