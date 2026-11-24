import { Module } from '@nestjs/common';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { TeamGuard } from './team.guard';
import { InviteResolver } from './invite.resolver';

@Module({
  imports: [],
  providers: [TeamResolver, InviteResolver, TeamService, TeamGuard],
  exports: [TeamService],
})
export class TeamModule {}
