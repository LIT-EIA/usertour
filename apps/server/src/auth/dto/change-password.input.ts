import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class ResetPasswordByCodeInput {
  @Field()
  @IsNotEmpty()
  @MinLength(12)
  password: string;

  @Field()
  @IsNotEmpty()
  code: string;
}
