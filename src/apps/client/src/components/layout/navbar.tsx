import React from 'react'
import { NavLink } from 'react-router'
import { Button } from '@copas/ui'
import { signOut } from '@/lib/session'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export interface NavbarProps {
  onSignOut?: () => void
  isSigningOut?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({ onSignOut, isSigningOut }) => {
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    } else {
      signOut()
    }
  }

  return (
    <nav className="w-full bg-transparent backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-xl font-bold tracking-tight text-foreground">CoPAS</div>
          <div className="flex space-x-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/cartera"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`
              }
            >
              Cartera
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </nav>
  )
}
