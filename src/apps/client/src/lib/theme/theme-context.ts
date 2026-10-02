import { createContext, useContext } from 'react'
import type { ThemeProviderState } from './types'

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
}

export const ThemeContext = createContext<ThemeProviderState>(initialState)

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
