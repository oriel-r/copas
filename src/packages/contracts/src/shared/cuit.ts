import { z } from 'zod'

const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

function validCuit(cuit: string): boolean {
  const digits = cuit.replace(/-/g, '')
  if (digits.length !== 11) return false
  if (!/^\d{11}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * weights[i]
  }
  const rest = sum % 11
  const check = rest === 0 ? 0 : 11 - rest === 10 ? 9 : 11 - rest
  return check === Number(digits[10])
}

export const cuitSchema = z
  .string()
  .regex(/^\d{2}-\d{8}-\d$/, 'CUIT inválido (formato XX-XXXXXXXX-X)')
  .refine(validCuit, 'CUIT inválido (dígito verificador incorrecto)')