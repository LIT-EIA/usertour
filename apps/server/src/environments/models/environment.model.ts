import { BaseModel } from '@/common/models/base.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Environment extends BaseModel {
  @Field()
  name: string;

  @Field(() => String)
  token: string;

  @Field(() => String)
  projectId: string;

  // Launcher focus settings (owner only); null timing uses the trap preset
  @Field(() => String)
  launcherFocusTrap?: string;

  @Field(() => Int, { nullable: true })
  launcherTabWindowMs?: number | null;

  @Field(() => Int, { nullable: true })
  launcherHoldFocusMs?: number | null;

  @Field(() => Int, { nullable: true })
  launcherMaxHoldCount?: number | null;

  // @Field(() => Boolean)
  // published: boolean;
}
