import { Module } from '@nestjs/common';
import { BattlesService } from './battles.service';
import { BattlesController } from './battles.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BattlesController],
  providers: [BattlesService],
  exports: [BattlesService],
})
export class BattlesModule {}
