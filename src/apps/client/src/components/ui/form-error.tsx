import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface FormErrorProps {
  message: string | null
  className?: string
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}