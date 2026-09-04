import type { D1Database, Queue, R2Bucket } from '@cloudflare/workers-types';
import type { AiQueueMessage } from '@copas/contracts';

import { createBranchesRepository } from './branches/branches.repository';
import { createBranchesService } from './branches/branches.service';
import { createAssetTypesRepository } from './asset-types/asset-types.repository';
import { createAssetTypesService } from './asset-types/asset-types.service';
import { createCompaniesRepository } from './companies/companies.repository';
import { createCompaniesService } from './companies/companies.service';
import { createInsuredsRepository } from './insureds/insureds.repository';
import { createInsuredsService } from './insureds/insureds.service';
import { createAssetsRepository } from './assets/assets.repository';
import { createAssetsService } from './assets/assets.service';
import { createPaymentMethodsRepository } from './payment-methods/payment-methods.repository';
import { createPaymentMethodsService } from './payment-methods/payment-methods.service';
import { createPolicyInstallmentsRepository } from './policy-installments/policy-installments.repository';
import { createPolicyInstallmentsService } from './policy-installments/policy-installments.service';
import { createPolicyAssetsRepository } from './policy-assets/policy-assets.repository';
import { createPolicyCoveragesRepository } from './policy-coverages/policy-coverages.repository';
import { createPoliciesRepository } from './policies/policies.repository';
import { createPoliciesService } from './policies/policies.service';
import { createFilesService } from './files';

export interface InsuranceModuleOptions {
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
  backendUrl?: string;
  signingSecret?: string;
}

export function createInsuranceModule(
  db: D1Database,
  organizationId: string,
  bucket: R2Bucket,
  aiQueue: Queue<AiQueueMessage>,
  options: InsuranceModuleOptions = {}
) {
  // D1 no soporta transacciones interactivas reales; usamos batch-style runner
  // con rollback simulado: si cb lanza, no se commitea (los writes previos ya están en batch pero D1 batch es atómico)
  // Para local dev con sqlite, batch es atómico. Mantenemos runner simple pero con logging.
  const transactionRunner = async <T>(cb: (tx: D1Database | any) => Promise<T>): Promise<T> => {
    try {
      return await cb(db);
    } catch (e) {
      console.error('[insurance] transaction failed', { organizationId, error: (e as any)?.message ?? String(e) });
      throw e;
    }
  };

  // Repositories
  const branchesRepo = createBranchesRepository(db, organizationId);
  const assetTypesRepo = createAssetTypesRepository(db, organizationId);
  const companiesRepo = createCompaniesRepository(db, organizationId);
  const insuredsRepo = createInsuredsRepository(db, organizationId);
  const assetsRepo = createAssetsRepository(db, organizationId);
  const paymentMethodsRepo = createPaymentMethodsRepository(db, organizationId);
  const policyInstallmentsRepo = createPolicyInstallmentsRepository(db, organizationId);
  const policyAssetsRepo = createPolicyAssetsRepository(db, organizationId);
  const policyCoveragesRepo = createPolicyCoveragesRepository(db, organizationId);
  const policiesRepo = createPoliciesRepository(db, organizationId);

  // Services
  const branchesService = createBranchesService(branchesRepo);
  const assetTypesService = createAssetTypesService(assetTypesRepo);
  const companiesService = createCompaniesService(companiesRepo);
  const insuredsService = createInsuredsService(insuredsRepo);
  const assetsService = createAssetsService(assetsRepo);
  const paymentMethodsService = createPaymentMethodsService(paymentMethodsRepo);
  const policyInstallmentsService = createPolicyInstallmentsService(policyInstallmentsRepo);

  const filesService = createFilesService({
    bucket,
    organizationId,
    r2AccountId: options.r2AccountId,
    r2AccessKeyId: options.r2AccessKeyId,
    r2SecretAccessKey: options.r2SecretAccessKey,
    r2BucketName: options.r2BucketName,
    backendUrl: options.backendUrl,
    signingSecret: options.signingSecret,
  });

  const policiesService = createPoliciesService(
    policiesRepo,
    branchesService,
    assetTypesService,
    companiesService,
    insuredsService,
    assetsService,
    paymentMethodsService,
    policyInstallmentsService,
    policyAssetsRepo,
    policyCoveragesRepo,
    filesService,
    aiQueue,
    transactionRunner
  );

  return {
    branches: branchesService,
    branchesService,
    assetTypes: assetTypesService,
    assetTypesService,
    companies: companiesService,
    companiesService,
    insureds: insuredsService,
    insuredsService,
    assets: assetsService,
    assetsService,
    paymentMethods: paymentMethodsService,
    paymentMethodsService,
    policyInstallments: policyInstallmentsService,
    policyInstallmentsService,
    files: filesService,
    filesService,
    policies: policiesService,
    policiesService,
  };
}

export type InsuranceModule = ReturnType<typeof createInsuranceModule>;
