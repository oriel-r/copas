import { z } from 'zod'

import { currencySchema } from './currency'
import { dateCivilSchema } from './date'
import { uuidV7Schema } from './id'
import { jsonObjectSchema } from './json'
import { moneySchema } from './money'
import { phoneSchema } from './phone'

export const requiredIdSchema = uuidV7Schema
export const optionalIdSchema = uuidV7Schema.optional()
export const nullableIdSchema = uuidV7Schema.nullable().optional()
export const nullableDateSchema = dateCivilSchema.nullable().optional()
export const nullableEmailSchema = z.email().nullable().optional()
export const nullablePhoneSchema = phoneSchema.nullable().optional()
export const nullableJsonSchema = jsonObjectSchema.nullable().optional()
export const optionalMoneySchema = moneySchema.optional()
export const optionalCurrencySchema = currencySchema.optional()