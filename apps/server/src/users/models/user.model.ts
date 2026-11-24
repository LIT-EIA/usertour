import { BaseModel } from '@/common/models/base.model';
import { UserOnProject } from '@/team/models/useronproject.model';
import { Field, HideField, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsEmail } from 'class-validator';
import 'reflect-metadata';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@ObjectType()
export class User extends BaseModel {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  /** Full name for display, resolved from firstName + lastName (see UsersResolver). */
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => [UserOnProject])
  projects?: [UserOnProject];

  @HideField()
  password: string;

  @Field(() => Boolean, { nullable: true })
  isOAuthUser?: boolean;
}
