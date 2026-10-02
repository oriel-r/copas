import {
  account,
  authRelations,
  invitation,
  member,
  organization,
  rateLimit,
  session,
  user,
  verification,
} from './schema'

export const authSchema = {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  rateLimit,
}

export { authRelations }