import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  code: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MinLength(12)
  password: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  firstName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  lastName?: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => Boolean, { nullable: false })
  isInvite: boolean;
}
