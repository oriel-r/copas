import type { InsuranceModule } from '../../modules/insurance/insurance.module';

export type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    tenantId: string;
    services: {
      insurance: InsuranceModule;
    };
  };
};
