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

export function createInsuranceModule(
  db: D1Database,
  tenantId: string,
  bucket: R2Bucket,
  aiQueue: Queue<AiQueueMessage>
) {
  const transactionRunner = async <T>(cb: (tx: D1Database | any) => Promise<T>): Promise<T> => {
    return await cb(db);
  };

  // Repositories
  const branchesRepo = createBranchesRepository(db, tenantId);
  const assetTypesRepo = createAssetTypesRepository(db, tenantId);
  const companiesRepo = createCompaniesRepository(db, tenantId);
  const insuredsRepo = createInsuredsRepository(db, tenantId);
  const assetsRepo = createAssetsRepository(db, tenantId);
  const paymentMethodsRepo = createPaymentMethodsRepository(db, tenantId);
  const policyInstallmentsRepo = createPolicyInstallmentsRepository(db, tenantId);
  const policyAssetsRepo = createPolicyAssetsRepository(db, tenantId);
  const policyCoveragesRepo = createPolicyCoveragesRepository(db, tenantId);
  const policiesRepo = createPoliciesRepository(db, tenantId);

  // Services
  const branchesService = createBranchesService(branchesRepo);
  const assetTypesService = createAssetTypesService(assetTypesRepo);
  const companiesService = createCompaniesService(companiesRepo);
  const insuredsService = createInsuredsService(insuredsRepo);
  const assetsService = createAssetsService(assetsRepo);
  const paymentMethodsService = createPaymentMethodsService(paymentMethodsRepo);
  const policyInstallmentsService = createPolicyInstallmentsService(policyInstallmentsRepo);
  
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
    bucket,
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
    policies: policiesService,
    policiesService,
  };
}

export type InsuranceModule = ReturnType<typeof createInsuranceModule>;
