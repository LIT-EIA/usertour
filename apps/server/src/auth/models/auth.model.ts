import { User } from '@/users/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { Token } from './token.model';

@ObjectType()
export class Auth extends Token {
  @Field(() => String, { nullable: true })
  redirectUrl?: string;

  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => User)
  user: User;
}

// Third-party (OAuth) sign-in has been removed; email/password is the only provider.
export type AuthProvider = 'email';

@ObjectType()
export class AuthConfigItem {
  @Field(() => String)
  provider: AuthProvider;
}
