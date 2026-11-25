import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../constants/password-policy';

@InputType()
export class ResetPasswordByCodeInput {
  @Field()
  @IsNotEmpty()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @Field()
  @IsNotEmpty()
  code: string;
}
