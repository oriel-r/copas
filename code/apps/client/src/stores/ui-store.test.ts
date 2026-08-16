import { describe, expect, it, beforeEach } from 'vitest'
import { useUiStore } from './ui-store'

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarOpen: false })
  })

  it('toggles the sidebar', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(false)

    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(true)

    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(false)
  })

  it('sets the sidebar state explicitly', () => {
    useUiStore.getState().setSidebarOpen(true)

    expect(useUiStore.getState().sidebarOpen).toBe(true)
  })
})
