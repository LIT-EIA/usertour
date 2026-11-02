import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

// Same values as LauncherFocusTrap in @usertour/types
export const LAUNCHER_FOCUS_TRAPS = [
  'auto',
  'focus-trap',
  'radix',
  'mui',
  'dojo',
  'cached',
  'carbon',
  'slow',
  'custom-adapter',
];

@InputType()
export class CreateEnvironmentInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  projectId: string;
}

@InputType()
export class UpdateEnvironmentInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;

  @Field()
  @IsNotEmpty()
  name: string;
}

@InputType()
export class DeleteEnvironmentInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;
}

@InputType()
export class UpdateEnvironmentLauncherFocusInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;

  @Field(() => String)
  @IsIn(LAUNCHER_FOCUS_TRAPS)
  trap: string;

  // null uses the trap preset
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  tabWindowMs?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  holdFocusMs?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxHoldCount?: number | null;
}
