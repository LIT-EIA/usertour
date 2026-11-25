import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../constants/password-policy';

@InputType()
export class SignupInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  code: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userName: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => Boolean, { nullable: false })
  isInvite: boolean;
}
