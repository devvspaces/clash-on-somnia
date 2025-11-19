import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VillagesService } from '../villages/villages.service';

@ApiTags('buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BuildingsController {
  constructor(
    private buildingsService: BuildingsService,
    private villagesService: VillagesService,
  ) {}

  @Post('add-starter-buildings')
  @ApiOperation({
    summary: 'Add starter buildings to current village (migration helper for Phase 1 users)',
  })
  @ApiResponse({ status: 200, description: 'Starter buildings added' })
  async addStarterBuildings(@Req() req) {
    const village = await this.villagesService.findByUserId(req.user.userId);
    if (!village) {
      return { message: 'Village not found', buildingsAdded: 0 };
    }

    const buildingsAdded = await this.buildingsService.addStarterBuildingsToVillage(village.id);

    return {
      message: `Added ${buildingsAdded} starter buildings to your village`,
      buildingsAdded,
    };
  }
}
