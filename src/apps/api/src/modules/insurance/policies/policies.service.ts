import type { UploadUrlRequest, UploadUrlResponse } from './policies.schema';
import type { AiResultQueuePayload, CreatePolicyRequest, Policy } from '@copas/contracts';
import { getLogger } from '@copas/logger';

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
  _bucket?: any,
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
  const queue = depsObj.aiQueue ?? aiQueue;
  const runner = depsObj.transactionRunner ?? transactionRunner ?? (async (cb: any) => await cb(undefined));
  const filesService = depsObj.filesService ?? (typeof _bucket?.generateTemporaryPublicUrl === 'function' ? _bucket : undefined);

  const logger = getLogger(['api', 'insurance']);

  return {
    generateUploadUrl: async (req: UploadUrlRequest, organizationId: string = 'default'): Promise<UploadUrlResponse> => {
      if (filesService) {
        return await filesService.generateUploadUrl(req.filename || 'document.pdf', organizationId, 300);
      }
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-1';
      const filename = req.filename || 'document.pdf';
      const key = `${organizationId}/${id}-${filename}`;
      const uploadUrl = `https://storage.copas.local/${key}`;

      logger.info('Generated upload URL for policy document: {key}', {
        key,
        filename,
        organizationId,
      });

      return {
        uploadUrl,
        policyAssetKey: key,
      };
    },

    processObjectCreateEvent: async (_bucketName: string, key: string, eTag: string): Promise<void> => {
      const parts = key.split('/');
      const organizationId = parts.length > 1 ? parts[0] : 'default';

      let documentUrl = key;
      if (filesService) {
        documentUrl = await filesService.generateTemporaryPublicUrl(key, 300);
      }

      const extractionResultId = await repo.createExtractionResult({
        documentUrl,
        status: 'pending',
      });
      const id = typeof extractionResultId === 'object' ? extractionResultId.id : extractionResultId;
      const reqId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `extract-${id}`;

      logger.info('Processing R2 object-create event for key: {key}', {
        key,
        eTag,
        organizationId,
        aiExtractionResultId: id,
        requestId: reqId,
      });

      if (queue && typeof queue.send === 'function') {
        await queue.send({
          type: 'ai-extraction',
          payload: {
            aiExtractionResultId: id,
            documentUrl,
          },
          metadata: {
            organizationId: organizationId,
            idempotencyKey: eTag || key || id,
            requestId: reqId,
          },
        });

        logger.info('Enqueued ai-extraction job for key: {key}', {
          key,
          aiExtractionResultId: id,
          organizationId,
          requestId: reqId,
        });
      }
    },

    triggerExtraction: async (documentUrl: string, organizationId: string = 'default', _userId: string = 'usr-1'): Promise<any> => {
      let resolvedDocumentUrl = documentUrl;
      const isUrl = documentUrl.startsWith('http://') || documentUrl.startsWith('https://') || documentUrl.startsWith('data:');
      if (!isUrl && filesService) {
        resolvedDocumentUrl = await filesService.generateTemporaryPublicUrl(documentUrl, 300);
      }

      const extractionResultId = await repo.createExtractionResult({
        documentUrl: resolvedDocumentUrl,
        status: 'pending',
      });
      const id = typeof extractionResultId === 'object' ? extractionResultId.id : extractionResultId;
      const reqId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `extract-${id}`;

      logger.info('Triggering AI extraction for documentUrl: {documentUrl}', {
        documentUrl: resolvedDocumentUrl,
        organizationId,
        aiExtractionResultId: id,
        requestId: reqId,
      });

      if (queue && typeof queue.send === 'function') {
        await queue.send({
          type: 'ai-extraction',
          payload: {
            aiExtractionResultId: id,
            documentUrl: resolvedDocumentUrl,
          },
          metadata: {
            organizationId: organizationId,
            idempotencyKey: id,
            requestId: reqId,
          },
        });

        logger.info('Enqueued ai-extraction message for documentUrl: {documentUrl}', {
          documentUrl: resolvedDocumentUrl,
          aiExtractionResultId: id,
          organizationId,
          requestId: reqId,
        });
      }

      return {
        aiExtractionResultId: id,
        status: 'pending',
        documentUrl: resolvedDocumentUrl,
      };
    },

    create: async (data: CreatePolicyRequest | any, tx?: any): Promise<Policy> => {
      return await repo.create(data, tx);
    },

    processAiResult: async (payload: AiResultQueuePayload & { organizationId?: string; userId?: string; uploadedBy?: string }): Promise<any> => {
      return await runner(async (tx: any) => {
        // Idempotencia: si ya existe extractionResult con policyId, devolver policy existente (at-least-once queue)
        if (payload.aiExtractionResultId && typeof repo.getExtractionResult === 'function') {
          try {
            const existing = await repo.getExtractionResult(payload.aiExtractionResultId, tx);
            if (existing?.policyId) {
              const already = typeof repo.findById === 'function' ? await repo.findById(existing.policyId, tx) : null;
              if (already) return already;
            }
            // si está en failed, permitir reintento; si on_review sin policyId, continuar
            if (existing && existing.status === 'on_review' && existing.policyId) {
              return await repo.findById(existing.policyId, tx);
            }
          } catch {
            // no bloquear flujo si lookup falla
          }
        }

        const extracted = payload.structuredPayload;
        const organizationId = payload.organizationId || (payload as any).metadata?.organizationId;
        if (!organizationId) throw new Error('organizationId required in payload');
        const userId = payload.userId ?? (payload as any).uploadedBy ?? 'usr-1';

        // 1. Company (search by code, fallback name = code)
        const compData = extracted.company;
        const compCode = compData?.code && compData.code.trim() !== '' ? compData.code : compData?.name;
        const compName = compData?.name && compData.name.trim() !== '' ? compData.name : compCode;
        const company = compSvc ? (
          typeof compSvc.findOrCreate === 'function'
            ? await compSvc.findOrCreate({ code: compCode, name: compName }, tx)
            : typeof compSvc.findByCode === 'function'
              ? await compSvc.findByCode(compCode, tx)
              : null
        ) : null;
        const companyId = typeof company === 'object' ? company?.id : company;

        // 2. Branch (search by code, fallback name = code)
        const branchCode = extracted.branch?.code || 'OTROS';
        const branch = branchSvc ? (
          typeof branchSvc.findOrCreate === 'function'
            ? await branchSvc.findOrCreate({ code: branchCode, name: branchCode }, tx)
            : typeof branchSvc.findByCode === 'function'
              ? await branchSvc.findByCode(branchCode, tx)
              : null
        ) : null;
        const branchId = typeof branch === 'object' ? branch?.id : branch;

        // 3. AssetType (search by code + branchId, fallback name = code)
        const assetTypeCode = extracted.assetType?.code || 'OTHER';
        const assetType = assetTypeSvc ? (
          typeof assetTypeSvc.findOrCreate === 'function'
            ? await assetTypeSvc.findOrCreate({
                code: assetTypeCode,
                name: (extracted.assetType as any)?.name || assetTypeCode,
                branchId,
              }, tx)
            : typeof assetTypeSvc.findByCode === 'function'
              ? await assetTypeSvc.findByCode(assetTypeCode, branchId, tx)
              : null
        ) : null;
        const assetTypeId = typeof assetType === 'object' ? assetType?.id : assetType;

        // 4. Insured (search by cuit in organization, fallback create)
        const insuredCuit = extracted.insured?.cuit && extracted.insured.cuit.trim() !== '' ? extracted.insured.cuit : '00000000000';
        const insuredPayload = {
          organizationId: organizationId,
          uploadedBy: userId,
          cuit: insuredCuit,
          fullName: extracted.insured?.fullName || 'CONSUMIDOR FINAL',
          phone: extracted.insured?.phone ?? null,
          email: extracted.insured?.email ?? null,
          birthDate: extracted.insured?.birthDate ?? null,
        };
        const insured = insuredSvc ? (
          typeof insuredSvc.findOrCreate === 'function'
            ? await insuredSvc.findOrCreate(insuredPayload, tx)
            : typeof insuredSvc.findByCuit === 'function'
              ? await insuredSvc.findByCuit(organizationId, insuredCuit, tx)
              : null
        ) : null;
        const insuredId = typeof insured === 'object' ? insured?.id : insured;

        // 5. Asset
        const assetPayload = {
          insuredId,
          assetTypeId,
          uploadedBy: userId,
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

        // 6. PaymentMethod (search by code, fallback name = code)
        let paymentMethodId: string | null = null;
        if (extracted.paymentMethod && payMethodSvc) {
          const pmCode = extracted.paymentMethod.code || 'PAGO_MANUAL';
          const pm = typeof payMethodSvc.findOrCreate === 'function'
            ? await payMethodSvc.findOrCreate({ code: pmCode, name: pmCode }, tx)
            : typeof payMethodSvc.findByCode === 'function'
              ? await payMethodSvc.findByCode(pmCode, tx)
              : null;
          paymentMethodId = typeof pm === 'object' ? pm?.id : pm;
        }

        // 7. Policy
        const polData = extracted.policy ?? extracted;
        const policyPayload = {
          organizationId: organizationId,
          uploadedBy: userId,
          companyId,
          insuredId,
          paymentMethodId,
          policyNumber: polData.policyNumber ?? '',
          premiumTotal: polData.premiumTotal ?? null,
          currency: polData.currency ?? 'ARS',
          startDate: polData.startDate ?? null,
          endDate: polData.endDate ?? null,
          billingFrequency: polData.billingFrequency ?? 'monthly',
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
            organizationId: organizationId,
            policyId,
            uploadedBy: userId,
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

        logger.info('Successfully persisted policy {policyNumber} (ID: {policyId}) from AI extraction', {
          policyId,
          policyNumber: polData.policyNumber,
          companyId,
          insuredId,
          installmentsCount: extracted.installments?.length ?? 0,
        });

        return policy;
      });
    },

    getById: async (id: string, tx?: any): Promise<Policy | null> => {
      return await repo.findById(id, tx);
    },

    getExtractionResult: async (id: string, tx?: any): Promise<any> => {
      if (typeof repo.getExtractionResult === 'function') return await repo.getExtractionResult(id, tx);
      return null;
    },

    update: async (id: string, data: any, tx?: any): Promise<any> => {
      if (typeof repo.update === 'function') return await repo.update(id, data, tx);
      throw new Error('update not implemented');
    },

    delete: async (id: string, tx?: any): Promise<any> => {
      if (typeof repo.delete === 'function') return await repo.delete(id, tx);
      throw new Error('delete not implemented');
    },

    findByNumber: async (orgId: string, companyIdOrNumber: string, maybeNumber?: string, tx?: any): Promise<any> => {
      // supports (orgId, policyNumber) or (orgId, companyId, policyNumber)
      if (maybeNumber !== undefined && typeof repo.findByNumber === 'function') {
        return await repo.findByNumber(orgId, companyIdOrNumber, maybeNumber, tx);
      }
      if (typeof repo.findByNumber === 'function') {
        return await repo.findByNumber(orgId, companyIdOrNumber, tx);
      }
      return null;
    },

    list: async (params?: { insuredId?: string; companyId?: string; limit?: number; offset?: number }, tx?: any): Promise<Policy[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type PoliciesService = ReturnType<typeof createPoliciesService>;


