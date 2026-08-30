import WineBarIcon from '~icons/material-symbols/wine-bar'
import { LoginForm } from '@/components/auth/login-form'
import { DemoBanner } from '@/components/layout/demo-banner'

export function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <DemoBanner />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <WineBarIcon className="size-4 shrink-0" />
          </div>
          <span className="whitespace-nowrap">Copas</span>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}