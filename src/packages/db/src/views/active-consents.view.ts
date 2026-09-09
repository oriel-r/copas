import { and, eq, isNull } from 'drizzle-orm'
import { sqliteView } from 'drizzle-orm/sqlite-core'

import { communicationCategories, communicationConsents } from '../contexts/communications'

export const vActiveConsents = sqliteView('v_active_consents').as((qb) =>
  qb
    .select({
      organizationId: communicationConsents.organizationId,
      insuredId: communicationConsents.insuredId,
      categoryId: communicationConsents.categoryId,
      categoryCode: communicationCategories.code,
      categoryName: communicationCategories.name,
      isOptedOut: communicationConsents.isOptedOut,
      optOutAt: communicationConsents.optOutAt,
      optOutReason: communicationConsents.optOutReason,
    })
    .from(communicationConsents)
    .innerJoin(
      communicationCategories,
      eq(communicationCategories.id, communicationConsents.categoryId),
    )
    .where(
      and(
        isNull(communicationConsents.deletedAt),
        isNull(communicationCategories.deletedAt),
      ),
    ),
)
