import type { InsuranceModule } from '../../modules/insurance/insurance.module';
import type { CommunicationsModule } from '../../modules/communications/communications.module';
import type { RemindersModule } from '../../modules/reminders/reminders.module';

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
      communications: CommunicationsModule;
      reminders: RemindersModule;
    };
  };
};

