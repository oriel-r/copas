import { describe, expect, it } from 'vitest'
import {
  buildReminderTemplateComponents,
  formatDateDayMonth,
} from './template-components.builder'

describe('template-components.builder', () => {
  describe('formatDateDayMonth', () => {
    it.each([
      { input: '2026-11-19', expected: '19/11', desc: 'YYYY-MM-DD' },
      { input: '2026-01-05', expected: '05/01', desc: 'leading zeros preserved' },
      {
        input: '2026-11-19T13:05:43.000Z',
        expected: '19/11',
        desc: 'ISO timestamp string',
      },
      {
        input: '  2026-09-20  ',
        expected: '20/09',
        desc: 'YYYY-MM-DD with surrounding whitespace',
      },
      { input: null, expected: '', desc: 'null' },
      { input: undefined, expected: '', desc: 'undefined' },
      { input: '', expected: '', desc: 'empty string' },
      { input: '   ', expected: '', desc: 'whitespace-only string' },
      {
        input: '  19/11/2026  ',
        expected: '19/11/2026',
        desc: 'non-YYYY-MM-DD trimmed raw string',
      },
      {
        input: 'próximo mes',
        expected: 'próximo mes',
        desc: 'arbitrary non-date string',
      },
    ])('formats $desc ($input) -> "$expected"', ({ input, expected }) => {
      expect(formatDateDayMonth(input)).toBe(expected)
    })
  })

  describe('buildReminderTemplateComponents', () => {
    it('returns 3 body parameters with DD/MM expiration_date and omits amount for recordatorio_vencimiento_hoy', () => {
      const components = buildReminderTemplateComponents({
        templateName: 'recordatorio_vencimiento_hoy',
        row: {
          insuredFullName: 'Carlos Fernandez',
          plateNumber: 'AF123CD',
          dueDate: '2026-11-19',
          totalAmount: 18500,
        },
      })

      expect(components).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: 'Carlos Fernandez' },
            { type: 'text', parameter_name: 'plate_number', text: 'AF123CD' },
            { type: 'text', parameter_name: 'expiration_date', text: '19/11' },
          ],
        },
      ])
      expect(components[0].parameters).toHaveLength(3)
      expect(
        components[0].parameters.find((p) => p.parameter_name === 'amount'),
      ).toBeUndefined()
    })

    it('uses expirationDate when dueDate is absent for recordatorio_vencimiento_hoy', () => {
      const components = buildReminderTemplateComponents({
        templateName: 'recordatorio_vencimiento_hoy',
        row: {
          insuredFullName: 'Ana García',
          plateNumber: 'AC456DE',
          expirationDate: '2026-12-03T10:00:00Z',
          totalAmount: 42000,
        },
      })

      expect(components).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: 'Ana García' },
            { type: 'text', parameter_name: 'plate_number', text: 'AC456DE' },
            { type: 'text', parameter_name: 'expiration_date', text: '03/12' },
          ],
        },
      ])
    })

    it('applies customer_name and plate_number fallbacks matching recordatorio_vencimiento', () => {
      const hoyComponents = buildReminderTemplateComponents({
        templateName: 'recordatorio_vencimiento_hoy',
        row: {
          insuredFullName: '',
          plateNumber: null,
          dueDate: '2026-11-19',
          totalAmount: 10000,
        },
      })

      expect(hoyComponents).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: 'Estimado/a cliente' },
            { type: 'text', parameter_name: 'plate_number', text: 'registrada' },
            { type: 'text', parameter_name: 'expiration_date', text: '19/11' },
          ],
        },
      ])
    })

    it('returns 4 body parameters with DD/MM/YYYY expiration_date and amount for recordatorio_vencimiento', () => {
      const components = buildReminderTemplateComponents({
        templateName: 'recordatorio_vencimiento',
        row: {
          insuredFullName: 'Carlos Fernandez',
          plateNumber: 'AF123CD',
          dueDate: '2026-09-20',
          totalAmount: 18500,
        },
      })

      expect(components).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: 'Carlos Fernandez' },
            { type: 'text', parameter_name: 'plate_number', text: 'AF123CD' },
            { type: 'text', parameter_name: 'expiration_date', text: '20/09/2026' },
            { type: 'text', parameter_name: 'amount', text: '18.500,00' },
          ],
        },
      ])
      expect(components[0].parameters).toHaveLength(4)
    })
  })
})
