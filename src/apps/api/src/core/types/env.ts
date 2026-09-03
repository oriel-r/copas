import type { InsuranceModule } from '../../modules/insurance/insurance.module';

export type AppEnv = {
  Bindings: any;
  Variables: {
    requestId: string;
    organizationId: string | null;
    userId: string | null;
    session: unknown | null;
    user: unknown | null;
    services: {
      insurance: InsuranceModule;
    };
  };
};
