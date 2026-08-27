import type { Queue, R2Bucket, D1Database } from '@cloudflare/workers-types';
import type { PoliciesRepository } from './policies.repository';
import type { BranchesService } from '../branches/branches.service';
import type { AssetTypesService } from '../asset-types/asset-types.service';
import type { CompaniesService } from '../companies/companies.service';
import type { InsuredsService } from '../insureds/insureds.service';
import type { AssetsService } from '../assets/assets.service';
import type { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import type { PolicyInstallmentsService } from '../policy-installments/policy-installments.service';
import type { PolicyAssetsRepository } from '../policy-assets/policy-assets.repository';
import type { PolicyCoveragesRepository } from '../policy-coverages/policy-coverages.repository';
import type { UploadUrlRequest, UploadUrlResponse } from './policies.schema';
import type { AiQueueMessage, AiResultQueuePayload } from '@copas/contracts';

export function createPoliciesService(
  repository: any,
  branchesService?: any,
  assetTypesService?: any,
  companiesService?: any,
  insuredsService?: any,
  assetsService?: any,
  paymentMethodsService?: any,
  policyInstallmentsService?: any,
  policyAssetsRepo?: any,
  policyCoveragesRepo?: any,
  bucket?: any,
  aiQueue?: any,
  transactionRunner?: any
) {
  const isDepsObj = typeof repository === 'object' && repository !== null && (
    'companiesService' in repository || 'branchesService' in repository || 'policiesRepository' in repository
  );
  const depsObj = isDepsObj ? repository : {};

  const repo = (depsObj.policiesRepository ?? depsObj.repository ?? repository)?.policiesRepository ?? (depsObj.policiesRepository ?? depsObj.repository ?? repository);
  const branchSvc = (depsObj.branchesService ?? branchesService)?.branchesService ?? (depsObj.branchesService ?? branchesService);
  const assetTypeSvc = (depsObj.assetTypesService ?? assetTypesService)?.assetTypesService ?? (depsObj.assetTypesService ?? assetTypesService);
  const compSvc = (depsObj.companiesService ?? companiesService)?.companiesService ?? (depsObj.companiesService ?? companiesService);
  const insuredSvc = (depsObj.insuredsService ?? insuredsService)?.insuredsService ?? (depsObj.insuredsService ?? insuredsService);
  const assetSvc = (depsObj.assetsService ?? assetsService)?.assetsService ?? (depsObj.assetsService ?? assetsService);
  const payMethodSvc = (depsObj.paymentMethodsService ?? paymentMethodsService)?.paymentMethodsService ?? (depsObj.paymentMethodsService ?? paymentMethodsService);
  const polInstSvc = (depsObj.policyInstallmentsService ?? policyInstallmentsService)?.policyInstallmentsService ?? (depsObj.policyInstallmentsService ?? policyInstallmentsService);
  const polAssetRepo = (depsObj.policyAssetsRepo ?? depsObj.policyAssetsRepository ?? policyAssetsRepo)?.policyAssetsRepository ?? (depsObj.policyAssetsRepo ?? depsObj.policyAssetsRepository ?? policyAssetsRepo);
  const polCovRepo = (depsObj.policyCoveragesRepo ?? depsObj.policyCoveragesRepository ?? policyCoveragesRepo)?.policyCoveragesRepository ?? (depsObj.policyCoveragesRepo ?? depsObj.policyCoveragesRepository ?? policyCoveragesRepo);
  const bkt = depsObj.bucket ?? bucket;
  const queue = depsObj.aiQueue ?? aiQueue;
  const runner = depsObj.transactionRunner ?? transactionRunner ?? (async (cb: any) => await cb(undefined));


  return {
    generateUploadUrl: async (req: UploadUrlRequest, tenantId: string = 'default'): Promise<UploadUrlResponse> => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-1';
      const key = `${tenantId}/${id}-${req.filename}`;
      const uploadUrl = `https://storage.copas.local/${key}`;
      return {
        uploadUrl,
        policyAssetKey: key,
      };
    },

    processObjectCreateEvent: async (bucketName: string, key: string, eTag: string): Promise<void> => {
      const parts = key.split('/');
      const tenantId = parts.length > 1 ? parts[0] : 'default';
      const extractionResultId = await repo.createExtractionResult({
        documentUrl: key,
        status: 'pending',
      });
      const id = typeof extractionResultId === 'object' ? extractionResultId.id : extractionResultId;

      if (queue && typeof queue.send === 'function') {
        await queue.send({
          type: 'ai-extraction',
          payload: {
            aiExtractionResultId: id,
            documentUrl: key,
          },
          metadata: {
            organizationId: tenantId,
            idempotencyKey: eTag || key || id,
          },
        });
      }
    },

    create: async (data: CreatePolicyRequest | any, tx?: any): Promise<Policy> => {
      return await repo.create(data, tx);
    },

    processAiResult: async (payload: AiResultQueuePayload & { tenantId?: string }): Promise<any> => {
      return await runner(async (tx: any) => {
        const extracted = payload.structuredPayload;
        const tenantId = (payload as any).tenantId || (payload as any).organizationId || 'default';

        // 1. Company
        const company = compSvc ? (
          typeof compSvc.findOrCreate === 'function'
            ? await compSvc.findOrCreate(extracted.company, tx)
            : typeof compSvc.findByCode === 'function'
              ? await compSvc.findByCode(extracted.company.code, tx)
              : null
        ) : null;
        const companyId = typeof company === 'object' ? company?.id : company;

        // 2. Branch
        const branch = branchSvc ? (
          typeof branchSvc.findOrCreate === 'function'
            ? await branchSvc.findOrCreate(extracted.branch, tx)
            : typeof branchSvc.findByCode === 'function'
              ? await branchSvc.findByCode(extracted.branch.code, tx)
              : null
        ) : null;
        const branchId = typeof branch === 'object' ? branch?.id : branch;

        // 3. AssetType
        const assetType = assetTypeSvc ? (
          typeof assetTypeSvc.findOrCreate === 'function'
            ? await assetTypeSvc.findOrCreate({
                code: extracted.assetType.code,
                name: extracted.assetType.name || extracted.assetType.code,
                branchId,
              }, tx)
            : typeof assetTypeSvc.findByCode === 'function'
              ? await assetTypeSvc.findByCode(extracted.assetType.code, branchId, tx)
              : null
        ) : null;
        const assetTypeId = typeof assetType === 'object' ? assetType?.id : assetType;

        // 4. Insured
        const insuredPayload = {
          organizationId: tenantId,
          uploadedBy: (payload as any).userId ?? (payload as any).uploadedBy ?? 'usr-1',
          cuit: extracted.insured?.cuit,
          fullName: extracted.insured?.fullName,
          phone: extracted.insured?.phone ?? null,
          email: extracted.insured?.email ?? null,
          birthDate: extracted.insured?.birthDate ?? null,
        };
        const insured = insuredSvc ? (
          typeof insuredSvc.findOrCreate === 'function'
            ? await insuredSvc.findOrCreate(insuredPayload, tx)
            : typeof insuredSvc.findByCuit === 'function'
              ? await insuredSvc.findByCuit(extracted.insured.cuit, tx)
              : null
        ) : null;
        const insuredId = typeof insured === 'object' ? insured?.id : insured;

        // 5. Asset
        const assetPayload = {
          insuredId,
          assetTypeId,
          uploadedBy: (payload as any).userId ?? (payload as any).uploadedBy ?? 'usr-1',
          properties: extracted.asset?.properties || {},
        };
        const asset = assetSvc ? (
          typeof assetSvc.findOrCreate === 'function'
            ? await assetSvc.findOrCreate(assetPayload, tx)
            : typeof assetSvc.create === 'function'
              ? await assetSvc.create(assetPayload, tx)
              : null
        ) : null;
        const assetId = typeof asset === 'object' ? asset?.id : asset;

        // 6. PaymentMethod
        let paymentMethodId: string | null = null;
        if (extracted.paymentMethod && payMethodSvc) {
          const pm = typeof payMethodSvc.findOrCreate === 'function'
            ? await payMethodSvc.findOrCreate(extracted.paymentMethod, tx)
            : typeof payMethodSvc.findByCode === 'function'
              ? await payMethodSvc.findByCode(extracted.paymentMethod.code, tx)
              : null;
          paymentMethodId = typeof pm === 'object' ? pm?.id : pm;
        }

        // 7. Policy
        const polData = extracted.policy ?? extracted;
        const policyPayload = {
          organizationId: tenantId,
          uploadedBy: (payload as any).userId ?? (payload as any).uploadedBy ?? 'usr-1',
          companyId,
          insuredId,
          paymentMethodId,
          policyNumber: polData.policyNumber ?? '',
          premiumTotal: polData.premiumTotal ?? null,
          currency: polData.currency ?? null,
          startDate: polData.startDate ?? null,
          endDate: polData.endDate ?? null,
          billingFrequency: polData.billingFrequency ?? null,
          status: 'active',
        };
        const policy = typeof repo.create === 'function'
          ? await repo.create(policyPayload, tx)
          : await repo.createPolicy(policyPayload, tx);
        const policyId = typeof policy === 'object' ? policy?.id : policy;

        // 8. Policy Asset Link
        if (policyId && assetId && polAssetRepo) {
          if (typeof polAssetRepo.linkAsset === 'function') {
            await polAssetRepo.linkAsset(policyId, assetId, tx);
          } else if (typeof polAssetRepo.create === 'function') {
            await polAssetRepo.create({ policyId, assetId }, tx);
          }
        }

        // 9. Coverages
        if (extracted.coverages && extracted.coverages.length > 0 && polCovRepo) {
          if (typeof polCovRepo.createMany === 'function') {
            await polCovRepo.createMany(extracted.coverages.map((c: any) => ({ policyId, data: c })), tx);
          } else if (typeof polCovRepo.createCoverage === 'function') {
            for (const c of extracted.coverages) {
              await polCovRepo.createCoverage(policyId, c, tx);
            }
          }
        }

        // 10. Installments
        if (extracted.installments && extracted.installments.length > 0 && polInstSvc) {
          const instData = extracted.installments.map((inst: any) => ({
            organizationId: tenantId,
            policyId,
            uploadedBy: (payload as any).userId ?? (payload as any).uploadedBy ?? 'usr-1',
            installmentNumber: inst.installmentNumber,
            dueDate: inst.dueDate,
            totalAmount: inst.totalAmount,
            currency: polData.currency ?? 'ARS',
            status: inst.status || 'pending',
          }));
          if (typeof polInstSvc.createMany === 'function') {
            await polInstSvc.createMany(instData, tx);
          } else if (typeof polInstSvc.createInstallments === 'function') {
            await polInstSvc.createInstallments(instData, tx);
          }
        }

        // 11. Update extraction result
        if (repo && typeof repo.updateExtractionResult === 'function') {
          await repo.updateExtractionResult(payload.aiExtractionResultId, {
            policyId,
            status: 'on_review',
            result: payload.structuredPayload,
          }, tx);
        }

        return policy;
      });
    },

    getById: async (id: string, tx?: any): Promise<Policy | null> => {
      return await repo.findById(id, tx);
    },

    list: async (params?: { insuredId?: string; companyId?: string; limit?: number; offset?: number }, tx?: any): Promise<Policy[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type PoliciesService = ReturnType<typeof createPoliciesService>;


