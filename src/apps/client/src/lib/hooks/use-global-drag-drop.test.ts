import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGlobalDragDrop } from './use-global-drag-drop'

describe('useGlobalDragDrop', () => {
  function createDragEvent(type: string, options?: { types?: string[]; files?: File[] }) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    const dt = {
      types: options?.types ?? ['Files'],
      files: options?.files ?? [],
      items: (options?.files ?? []).map((f) => ({
        kind: 'file',
        type: f.type,
        getAsFile: () => f,
      })),
      dropEffect: 'none',
      effectAllowed: 'all',
    }
    Object.defineProperty(event, 'dataTransfer', {
      value: dt,
      writable: false,
    })
    return event
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with isDragging as false', () => {
    const { result } = renderHook(() => useGlobalDragDrop())
    expect(result.current.isDragging).toBe(false)
  })

  it('should change isDragging to true on dragenter when dataTransfer.types contains "Files"', () => {
    const { result } = renderHook(() => useGlobalDragDrop())

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })

    expect(result.current.isDragging).toBe(true)
  })

  it('should ignore dragenter events when types does NOT contain "Files"', () => {
    const { result } = renderHook(() => useGlobalDragDrop())

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['text/plain'] }))
    })
    expect(result.current.isDragging).toBe(false)

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: [] }))
    })
    expect(result.current.isDragging).toBe(false)
  })

  it('should prevent flickering over child elements by maintaining dragCounter', () => {
    const { result } = renderHook(() => useGlobalDragDrop())

    // Enter window (dragCounter = 1)
    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(true)

    // Enter child element (dragCounter = 2)
    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(true)

    // Leave child element (dragCounter = 1, should NOT turn off isDragging)
    act(() => {
      window.dispatchEvent(createDragEvent('dragleave', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(true)

    // Leave window completely (dragCounter = 0, resets isDragging to false)
    act(() => {
      window.dispatchEvent(createDragEvent('dragleave', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(false)
  })

  it('should preventDefault on dragover when dragging files', () => {
    renderHook(() => useGlobalDragDrop())

    const dragOverEvent = createDragEvent('dragover', { types: ['Files'] })
    const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault')

    act(() => {
      window.dispatchEvent(dragOverEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should reset isDragging to false when Escape key is pressed', () => {
    const { result } = renderHook(() => useGlobalDragDrop())

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(true)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(result.current.isDragging).toBe(false)
  })

  it('should reset isDragging and call onFilesDropped with files on drop event', () => {
    const onFilesDropped = vi.fn()
    const { result } = renderHook(() => useGlobalDragDrop({ onFilesDropped }))

    const fileA = new File(['pdf-a'], 'poliza_a.pdf', { type: 'application/pdf' })
    const fileB = new File(['pdf-b'], 'poliza_b.pdf', { type: 'application/pdf' })

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })
    expect(result.current.isDragging).toBe(true)

    const dropEvent = createDragEvent('drop', {
      types: ['Files'],
      files: [fileA, fileB],
    })
    const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault')

    act(() => {
      window.dispatchEvent(dropEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(result.current.isDragging).toBe(false)
    expect(onFilesDropped).toHaveBeenCalledTimes(1)
    expect(onFilesDropped).toHaveBeenCalledWith([fileA, fileB])
  })

  it('should clean up window event listeners on unmount', () => {
    const onFilesDropped = vi.fn()
    const { result, unmount } = renderHook(() => useGlobalDragDrop({ onFilesDropped }))

    unmount()

    act(() => {
      window.dispatchEvent(createDragEvent('dragenter', { types: ['Files'] }))
    })

    expect(result.current.isDragging).toBe(false)
  })
})
