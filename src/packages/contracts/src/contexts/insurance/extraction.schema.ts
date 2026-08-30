import { z } from 'zod';

export const extractedPolicySchema = z.object({
  company: z.object({
    name: z.string().describe('Nombre de la compañía aseguradora (ej. SANCOR, MERCANTIL ANDINA). Devolver en MAYÚSCULAS y SIN ACENTOS. Si no se encuentra, devolver string vacío.'),
    code: z.string().describe('Código interno de la compañía si se encuentra explícito en el PDF. Si no, devolver string vacío.'),
  }).describe('Información de la compañía aseguradora'),

  branch: z.object({
    code: z.enum([
      'AUTO', 'MOTO', 'HOME', 'COMMERCE', 
      'VIDA', 'AP', 'ART', 'CAU', 'TRANS', 
      'INCENDIO', 'ROBO', 'RC', 'OTROS'
    ]).describe('Código normalizado del ramo del seguro. Clasificar estrictamente en una de las opciones dadas.'),
  }).describe('Ramo de la póliza'),

  policy: z.object({
    policyNumber: z.string().describe('Número de póliza completo.'),
    premiumTotal: z.number().nullable().describe('Premio total a cobrar (incluye impuestos). Si no figura, devolver null.'),
    currency: z.enum(['ARS']).describe('Moneda de la póliza (solo se acepta ARS).'),
    startDate: z.string().describe('Fecha de inicio de vigencia en formato YYYY-MM-DD.'),
    endDate: z.string().describe('Fecha de fin de vigencia en formato YYYY-MM-DD.'),
    billingFrequency: z.enum(['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'single_payment']).describe('Frecuencia de facturación de las cuotas.'),
  }).describe('Datos principales de la póliza'),

  insured: z.object({
    fullName: z.string().describe('Nombre completo o razón social del asegurado. Devolver en MAYÚSCULAS y SIN ACENTOS.'),
    cuit: z.string().describe('CUIT/CUIL/DNI del asegurado sin guiones. Si no se encuentra, devolver string vacío.'),
    email: z.string().describe('Correo electrónico del asegurado. Devolver en minúsculas. Si no se encuentra, devolver string vacío.'),
    phone: z.string().describe('Teléfono del asegurado (solo números, omitir + y agregar siempre el prefijo de país 54 al inicio, ej. 5411...). Si no se encuentra, devolver string vacío.'),
    birthDate: z.string().describe('Fecha de nacimiento en formato YYYY-MM-DD. Si no se encuentra, devolver string vacío.'),
  }).describe('Datos del titular/asegurado'),

  assetType: z.object({
    code: z.enum([
      'AUTO', 'MOTO', 'HOME', 'BUSINESS', 
      'PERSON', 'LIFE', 'OTHER'
    ]).describe('Código normalizado del tipo de bien asegurado.'),
  }),

  asset: z.object({
    properties: z.record(z.string(), z.any()).describe('Propiedades clave-valor extraídas del bien (ej. patente, marca, modelo, año, motor, chasis, suma_asegurada, ubicacion). Todos los valores de texto deben estar en MAYÚSCULAS y SIN ACENTOS. Extraer exhaustivamente.'),
  }).describe('Bien asegurado.'),

  paymentMethod: z.object({
    code: z.enum(['PAGO_MANUAL', 'AUTOMATICO_DEBITO', 'AUTOMATICO_CREDITO']).describe('Método de pago normalizado detectado en la póliza.'),
  }).describe('Medio de pago de la póliza'),

  coverages: z.array(
    z.object({
      name: z.string().describe('Nombre de la cobertura o riesgo. Devolver en MAYÚSCULAS y SIN ACENTOS.'),
      limit: z.number().nullable().describe('Límite de suma asegurada para esta cobertura. Si no hay, devolver null.'),
      franchise: z.number().nullable().describe('Monto de franquicia, si aplica. Si no hay, devolver null.'),
    })
  ).describe('Detalle de coberturas y riesgos amparados. Si no hay detalle, devolver array vacío []'),

  installments: z.array(
    z.object({
      installmentNumber: z.number().describe('Número de cuota (entero).'),
      dueDate: z.string().describe('Fecha de vencimiento de la cuota en formato YYYY-MM-DD.'),
      totalAmount: z.number().describe('Monto total a pagar por esta cuota.'),
    })
  ).describe('Cronograma de cuotas (plan de pagos). Si es pago único, extraer un array con un único objeto representando el pago total.'),
});

export type ExtractedPolicy = z.infer<typeof extractedPolicySchema>;
