import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@InputType()
export class InviteTeamMemberInput {
  @Field(() => String, { nullable: false })
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  firstName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  lastName?: string;

  @Field(() => Role, { nullable: false })
  @IsNotEmpty()
  role: Role;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}

@InputType()
export class RemoveTeamMemberInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;
}

@InputType()
export class ChangeTeamMemberRoleInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;

  @Field(() => Role, { nullable: false })
  @IsNotEmpty()
  role: Role;
}

@InputType()
export class CancelInviteInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  inviteId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}

@InputType()
export class ActiveUserProjectInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}
