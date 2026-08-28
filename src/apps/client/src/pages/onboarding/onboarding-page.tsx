import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authClient } from '@/lib/auth-client'

export function OnboardingPage() {
  // Subagent instruction:
  // 1. Implement a minimalist form using Shadcn components from @copas/ui.
  // 2. Form must ask: "¿Cómo se llama tu agencia?" and collect the `name`.
  // 3. On submit, call `authClient.organization.create({ name, slug: name })`.
  // 4. Handle loading states and errors.
  // 5. On success, redirect to `/dashboard`.
  throw new Error('OnboardingPage Not implemented')
}
