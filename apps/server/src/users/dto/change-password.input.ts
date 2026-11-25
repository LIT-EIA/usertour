import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '@/auth/constants/password-policy';

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsNotEmpty()
  oldPassword: string;

  @Field()
  @IsNotEmpty()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword: string;
}
