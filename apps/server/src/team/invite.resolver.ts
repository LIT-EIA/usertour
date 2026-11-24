import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { formatFullName } from '@/utils/person-name';

import { Invite } from './models/invite.model';

/** Field resolvers for the `Invite` GraphQL type. */
@Resolver(() => Invite)
export class InviteResolver {
  /** Full name for display; the stored values are `firstName` and `lastName`. */
  @ResolveField('name', () => String)
  name(@Parent() invite: Invite): string {
    return formatFullName(invite);
  }
}
