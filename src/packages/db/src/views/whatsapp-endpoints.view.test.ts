import { describe, it, expect, vi } from 'vitest'
import { getColumns, eq, and, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { vActiveWhatsAppEndpoints } from '../views/whatsapp-endpoints.view'

describe('vActiveWhatsAppEndpoints Drizzle View', () => {
  const expectedColumns = [
    'organizationChannelEndpointId',
    'organizationId',
    'endpointId',
    'endpointNumber',
    'ownerKind',
    'isPrimary',
    'channelId',
    'integrationId',
    'integrationStatus',
    'encryptedCredentials',
    'integrationConfig',
  ] as const

  const createMockD1 = () =>
    ({
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        raw: vi.fn().mockResolvedValue([]),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      batch: vi.fn().mockResolvedValue([]),
      exec: vi.fn().mockResolvedValue(undefined),
      dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    }) as any

  // =========================================================================
  // 1. View Schema and Selected Columns Structure
  // =========================================================================
  describe('View Column Structure Contract', () => {
    it('is defined and exports a Drizzle SQLite view instance', () => {
      expect(vActiveWhatsAppEndpoints).toBeDefined()
      const viewName = (vActiveWhatsAppEndpoints as any)._?.name ?? (vActiveWhatsAppEndpoints as any).name
      expect(viewName).toMatch(/whatsapp_endpoints/)
    })

    it('exposes exactly all required columns in getColumns()', () => {
      const columns = getColumns(vActiveWhatsAppEndpoints)
      const columnNames = Object.keys(columns)

      for (const col of expectedColumns) {
        expect(columnNames).toContain(col)
      }
      expect(columnNames.sort()).toEqual([...expectedColumns].sort())
    })

    it.each(expectedColumns)('provides direct property access to column "%s"', (colName) => {
      expect((vActiveWhatsAppEndpoints as any)[colName]).toBeDefined()
    })
  })

  // =========================================================================
  // 2. Query Compilation with Drizzle & D1
  // =========================================================================
  describe('Query Builder Selection', () => {
    it('compiles a SELECT * query over vActiveWhatsAppEndpoints', () => {
      const db = drizzle(createMockD1())
      const query = db.select().from(vActiveWhatsAppEndpoints)
      const compiled = query.toSQL()

      expect(compiled.sql).toBeDefined()
      expect(compiled.sql.toLowerCase()).toMatch(/select .* from [`"]?v_.*whatsapp_endpoints[`"]?/)
    })

    it('compiles a projected SELECT with WHERE filters on organizationId and isPrimary', () => {
      const db = drizzle(createMockD1())
      const testOrgId = '018f9e2b-1111-7000-8000-000000000001'

      const query = db
        .select({
          organizationChannelEndpointId: vActiveWhatsAppEndpoints.organizationChannelEndpointId,
          endpointNumber: vActiveWhatsAppEndpoints.endpointNumber,
          encryptedCredentials: vActiveWhatsAppEndpoints.encryptedCredentials,
          integrationConfig: vActiveWhatsAppEndpoints.integrationConfig,
        })
        .from(vActiveWhatsAppEndpoints)
        .where(
          and(
            eq(vActiveWhatsAppEndpoints.organizationId, testOrgId),
            eq(vActiveWhatsAppEndpoints.isPrimary, true),
          ),
        )

      const compiled = query.toSQL()
      expect(compiled.sql).toBeDefined()
      expect(compiled.params).toContain(testOrgId)
    })
  })

  // =========================================================================
  // 3. View Definition Invariants (deletedAt IS NULL, status='active', isEnabled=true)
  // =========================================================================
  describe('View Invariants and Filtering Rules', () => {
    it('underlying view definition enforces soft-delete filtering (deletedAt IS NULL)', () => {
      const viewQuery = (vActiveWhatsAppEndpoints as any).query ?? (vActiveWhatsAppEndpoints as any)._?.query
      expect(viewQuery).toBeDefined()

      const querySql = typeof viewQuery?.toSQL === 'function'
        ? viewQuery.toSQL().sql.toLowerCase()
        : JSON.stringify(viewQuery).toLowerCase()

      // The view query must check for deleted_at / deletedAt IS NULL
      expect(querySql).toMatch(/deleted_?at[`"]?\s+is\s+null/i)
    })

    it('underlying view definition filters active status (status = "active")', () => {
      const viewQuery = (vActiveWhatsAppEndpoints as any).query ?? (vActiveWhatsAppEndpoints as any)._?.query
      expect(viewQuery).toBeDefined()

      const querySql = typeof viewQuery?.toSQL === 'function'
        ? viewQuery.toSQL().sql.toLowerCase()
        : JSON.stringify(viewQuery).toLowerCase()

      // Must require active status for integrations/endpoints
      expect(querySql).toMatch(/status[`"]?\s*=\s*['"]active['"]/i)
    })

    it('underlying view definition enforces enabled organization channels (isEnabled = true / 1)', () => {
      const viewQuery = (vActiveWhatsAppEndpoints as any).query ?? (vActiveWhatsAppEndpoints as any)._?.query
      expect(viewQuery).toBeDefined()

      const querySql = typeof viewQuery?.toSQL === 'function'
        ? viewQuery.toSQL().sql.toLowerCase()
        : JSON.stringify(viewQuery).toLowerCase()

      // Must require is_enabled = 1 / true
      expect(querySql).toMatch(/is_?enabled[`"]?\s*=\s*(1|true)/i)
    })
  })
})
