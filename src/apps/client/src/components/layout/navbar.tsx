import React from 'react'
import { NavLink } from 'react-router'
import { Button } from '@copas/ui'
import { signOut } from '@/lib/session'

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
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-xl font-bold tracking-tight text-white">CoPAS</div>
          <div className="flex space-x-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-zinc-400'}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/cartera"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-zinc-400'}`
              }
            >
              Cartera
            </NavLink>
          </div>
        </div>
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-zinc-400 hover:text-white"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </nav>
  )
}
