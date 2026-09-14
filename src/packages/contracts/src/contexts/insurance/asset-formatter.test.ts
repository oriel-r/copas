import { describe, expect, it } from 'vitest'
import {
  formatAssetDescription,
  type AssetFormatInput,
} from './asset-formatter'

describe('asset-formatter contract - formatAssetDescription', () => {
  describe('Given null, undefined, or empty inputs', () => {
    it('should return "-" when asset is null', () => {
      expect(formatAssetDescription(null)).toBe('-')
    })

    it('should return "-" when asset is undefined', () => {
      expect(formatAssetDescription(undefined)).toBe('-')
    })

    it('should return "-" when asset is empty object and no type names exist', () => {
      expect(formatAssetDescription({})).toBe('-')
    })

    it('should return assetTypeName when properties is missing but assetTypeName is present', () => {
      const asset: AssetFormatInput = {
        assetTypeName: 'Automotor',
      }
      expect(formatAssetDescription(asset)).toBe('Automotor')
    })

    it('should return assetTypeCode when properties and assetTypeName are missing but assetTypeCode is present', () => {
      const asset: AssetFormatInput = {
        assetTypeCode: 'AUTO',
      }
      expect(formatAssetDescription(asset)).toBe('AUTO')
    })

    it('should return "-" when properties is not a valid object', () => {
      const asset = { properties: 'invalid' as any }
      expect(formatAssetDescription(asset)).toBe('-')
    })
  })

  describe('Given automotive / vehicle assets (brand, model, plate, year)', () => {
    it('should format brand, model, plate, and year accurately', () => {
      const asset: AssetFormatInput = {
        properties: {
          marca: 'TOYOTA',
          modelo: 'COROLLA',
          patente: 'AB123CD',
          anio: 2022,
        },
      }
      expect(formatAssetDescription(asset)).toBe('TOYOTA COROLLA (AB123CD) 2022')
    })

    it('should format brand, model, and plate without year', () => {
      const asset: AssetFormatInput = {
        properties: {
          marca: 'FORD',
          modelo: 'FOCUS',
          patente: 'AA999ZZ',
        },
      }
      expect(formatAssetDescription(asset)).toBe('FORD FOCUS (AA999ZZ)')
    })

    it('should format brand and model without plate or year', () => {
      const asset: AssetFormatInput = {
        properties: {
          marca: 'VOLKSWAGEN',
          modelo: 'GOL TREND',
        },
      }
      expect(formatAssetDescription(asset)).toBe('VOLKSWAGEN GOL TREND')
    })

    it('should format plate only when brand and model are absent', () => {
      const asset: AssetFormatInput = {
        properties: {
          patente: 'AD789GH',
        },
      }
      expect(formatAssetDescription(asset)).toBe('(AD789GH)')
    })

    it('should support english property aliases (brand, model, plate, year)', () => {
      const asset: AssetFormatInput = {
        properties: {
          brand: 'CHEVROLET',
          model: 'CRUZE',
          plate: 'AC456DF',
          year: 2021,
        },
      }
      expect(formatAssetDescription(asset)).toBe('CHEVROLET CRUZE (AC456DF) 2021')
    })

    it('should support alternative spanish keys (dominio, ano)', () => {
      const asset: AssetFormatInput = {
        properties: {
          marca: 'PEUGEOT',
          modelo: '208',
          dominio: 'AF111ZZ',
          ano: 2020,
        },
      }
      expect(formatAssetDescription(asset)).toBe('PEUGEOT 208 (AF111ZZ) 2020')
    })

    it('should handle whitespace in property values gracefully', () => {
      const asset: AssetFormatInput = {
        properties: {
          marca: '  RENAULT  ',
          modelo: 'SANDERO',
          patente: 'AE333QQ',
        },
      }
      expect(formatAssetDescription(asset)).toContain('RENAULT')
      expect(formatAssetDescription(asset)).toContain('SANDERO')
      expect(formatAssetDescription(asset)).toContain('(AE333QQ)')
    })
  })

  describe('Given real estate / property assets (address, location)', () => {
    it('should format direccion when present', () => {
      const asset: AssetFormatInput = {
        properties: {
          direccion: 'Av. Corrientes 1234, CABA',
        },
      }
      expect(formatAssetDescription(asset)).toBe('Av. Corrientes 1234, CABA')
    })

    it('should format ubicacion when direccion is absent', () => {
      const asset: AssetFormatInput = {
        properties: {
          ubicacion: 'Calle 50 Nro 789, La Plata',
        },
      }
      expect(formatAssetDescription(asset)).toBe('Calle 50 Nro 789, La Plata')
    })

    it('should format address or location from english aliases', () => {
      const asset1: AssetFormatInput = {
        properties: {
          address: 'Av. Santa Fe 2000',
        },
      }
      expect(formatAssetDescription(asset1)).toBe('Av. Santa Fe 2000')

      const asset2: AssetFormatInput = {
        properties: {
          location: 'Parque Industrial Pilar Lote 45',
        },
      }
      expect(formatAssetDescription(asset2)).toBe('Parque Industrial Pilar Lote 45')
    })
  })

  describe('Given generic descriptions or fallback scenarios', () => {
    it('should format descripcion when no vehicle or address keys exist', () => {
      const asset: AssetFormatInput = {
        properties: {
          descripcion: 'Maquinaria vial retroexcavadora',
        },
      }
      expect(formatAssetDescription(asset)).toBe('Maquinaria vial retroexcavadora')
    })

    it('should format description or nombre aliases', () => {
      const assetDescription: AssetFormatInput = {
        properties: {
          description: 'Flota de autoelevadores',
        },
      }
      expect(formatAssetDescription(assetDescription)).toBe('Flota de autoelevadores')

      const assetNombre: AssetFormatInput = {
        properties: {
          nombre: 'Embarcación deportiva',
        },
      }
      expect(formatAssetDescription(assetNombre)).toBe('Embarcación deportiva')
    })

    it('should fall back to assetTypeName when properties object has no recognizable fields', () => {
      const asset: AssetFormatInput = {
        assetTypeName: 'Integral de Comercio',
        properties: {
          arbitraryField: 'value123',
        },
      }
      expect(formatAssetDescription(asset)).toBe('Integral de Comercio')
    })

    it('should fall back to assetTypeCode when assetTypeName is absent and properties has no recognizable fields', () => {
      const asset: AssetFormatInput = {
        assetTypeCode: 'ACCIDENTES_PERSONALES',
        properties: {},
      }
      expect(formatAssetDescription(asset)).toBe('ACCIDENTES_PERSONALES')
    })

    it('should fall back to "-" when properties has no recognizable fields and types are absent', () => {
      const asset: AssetFormatInput = {
        properties: {
          foo: 'bar',
        },
      }
      expect(formatAssetDescription(asset)).toBe('-')
    })
  })
})
