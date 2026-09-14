import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, isNull, inArray, countDistinct } from 'drizzle-orm';
import { insureds, policies, companies, policyAssets, assets, assetTypes, branches } from '@copas/db';
import type { Insured, CreateInsuredRequest, InsuredsDetailedResponse, InsuredDetailedItem, InsuredsFilter, InsuredFilterOptions } from '@copas/contracts';
import { formatAssetDescription } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createInsuredsRepository(db: D1Database | any, organizationId: string = 'default') {
  return {
    findById: async (id: string, tx?: any): Promise<Insured | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(insureds)
        .where(and(eq(insureds.organizationId, organizationId), eq(insureds.id, id)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByCuit: async (orgIdOrCuit: string, cuitOrTx?: string | any, tx?: any): Promise<Insured | null> => {
      let orgId = organizationId;
      let cuit = orgIdOrCuit;
      let actualTx = cuitOrTx;
      if (typeof cuitOrTx === 'string') {
        orgId = orgIdOrCuit;
        cuit = cuitOrTx;
        actualTx = tx;
      }
      const client = getClient(db, actualTx);
      const rows = await client
        .select()
        .from(insureds)
        .where(and(eq(insureds.organizationId, orgId), eq(insureds.cuit, cuit)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateInsuredRequest | any, tx?: any): Promise<Insured> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(insureds)
        .values({
          organizationId: data.organizationId || organizationId,
          uploadedBy: data.uploadedBy || 'system',
          cuit: data.cuit || '',
          fullName: data.fullName || data.full_name || '',
          phone: data.phone || null,
          email: data.email || null,
          birthDate: data.birthDate || data.birth_date || null,
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    update: async (id: string, data: Partial<CreateInsuredRequest> | any, tx?: any): Promise<Insured> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(insureds)
        .set(data)
        .where(and(eq(insureds.organizationId, organizationId), eq(insureds.id, id)))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Insured[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(insureds)
        .where(eq(insureds.organizationId, organizationId))
        .limit(params?.limit ?? 50)
        .offset(params?.offset ?? 0);
      return rows ?? [];
    },

    findWithDetails: async (filters: InsuredsFilter, tx?: any): Promise<InsuredsDetailedResponse> => {
      const client = getClient(db, tx);
      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      const conditions = [
        eq(insureds.organizationId, organizationId),
        isNull(insureds.deletedAt)
      ];

      if (filters.companyId) {
        conditions.push(eq(policies.companyId, filters.companyId));
      }
      if (filters.branchId) {
        conditions.push(eq(assetTypes.branchId, filters.branchId));
      }
      if (filters.policyStatus && filters.policyStatus !== 'all' as any) {
        conditions.push(eq(policies.status, filters.policyStatus));
      }

      const countRes = await client
        .select({ count: countDistinct(insureds.id) })
        .from(insureds)
        .leftJoin(policies, eq(policies.insuredId, insureds.id))
        .leftJoin(policyAssets, eq(policyAssets.policyId, policies.id))
        .leftJoin(assets, eq(assets.id, policyAssets.assetId))
        .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
        .where(and(...conditions));
      const total = countRes[0]?.count ?? 0;

      if (total === 0) {
        return { items: [], total: 0 };
      }

      const idsRes = await client
        .select({ id: insureds.id })
        .from(insureds)
        .leftJoin(policies, eq(policies.insuredId, insureds.id))
        .leftJoin(policyAssets, eq(policyAssets.policyId, policies.id))
        .leftJoin(assets, eq(assets.id, policyAssets.assetId))
        .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
        .where(and(...conditions))
        .groupBy(insureds.id)
        .limit(limit)
        .offset(offset);

      const insuredIds = idsRes.map((r: { id: string }) => r.id);
      
      if (insuredIds.length === 0) {
        return { items: [], total: 0 };
      }

      const detailsQuery = client
        .select({
          insured: insureds,
          policy: policies,
          company: companies,
          assetType: assetTypes,
          asset: assets,
          branch: branches
        })
        .from(insureds)
        .leftJoin(policies, eq(policies.insuredId, insureds.id))
        .leftJoin(companies, eq(companies.id, policies.companyId))
        .leftJoin(policyAssets, eq(policyAssets.policyId, policies.id))
        .leftJoin(assets, eq(assets.id, policyAssets.assetId))
        .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
        .leftJoin(branches, eq(branches.id, assetTypes.branchId))
        .where(inArray(insureds.id, insuredIds));

      const details = await detailsQuery;
      
      const mapped = new Map<string, InsuredDetailedItem>();
      
      for (const row of details) {
        const ins = row.insured;
        if (!mapped.has(ins.id)) {
          mapped.set(ins.id, {
            id: ins.id,
            fullName: ins.fullName,
            cuit: ins.cuit,
            phone: ins.phone,
            email: ins.email,
            birthDate: ins.birthDate,
            companies: [],
            activePoliciesCount: 0,
            policies: []
          });
        }
        
        const item = mapped.get(ins.id)!;
        const pol = row.policy;
        
        if (pol) {
          const existingPol = item.policies.find(p => p.id === pol.id);
          if (!existingPol) {
            const comp = row.company;
            const branch = row.branch;
            const asset = row.asset;
            const assetType = row.assetType;
            
            if (pol.status === 'active') {
              item.activePoliciesCount++;
            }
            if (comp && !item.companies.includes(comp.name)) {
              item.companies.push(comp.name);
            }
            
            item.policies.push({
              id: pol.id,
              policyNumber: pol.policyNumber || '-',
              companyId: pol.companyId || '',
              companyName: comp?.name || '-',
              branchId: assetType?.branchId || '',
              branchName: branch?.name || '-',
              assetDescription: formatAssetDescription({
                properties: asset?.properties as any,
                assetTypeName: assetType?.name,
                assetTypeCode: assetType?.code,
              }),
              startDate: pol.startDate || pol.createdAt,
              endDate: pol.endDate || pol.createdAt,
              status: pol.status as any,
            });
          }
        }
      }
      
      return {
        items: Array.from(mapped.values()),
        total
      };
    },

    getFilterOptions: async (tx?: any): Promise<InsuredFilterOptions> => {
      const client = getClient(db, tx);
      const comps = await client.select({ id: companies.id, name: companies.name }).from(companies);
      const brs = await client.select({ id: branches.id, name: branches.name }).from(branches);
      return { companies: comps, branches: brs };
    }
  };
}

export type InsuredsRepository = ReturnType<typeof createInsuredsRepository>;


