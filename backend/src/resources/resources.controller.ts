import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user resources' })
  @ApiResponse({ status: 200, description: 'Resources retrieved' })
  @ApiResponse({ status: 404, description: 'Resources not found' })
  async getMyResources(@Req() req) {
    const resources = await this.resourcesService.getResourcesByUserId(req.user.userId);

    // Calculate pending resources
    const village = req.user.userId;
    // For now, we'll get the village ID from the resources
    const { generatedGold, generatedElixir } =
      await this.resourcesService.calculateGeneratedResources(resources.villageId);
    const { maxGold, maxElixir } = await this.resourcesService.getStorageCapacities(
      resources.villageId,
    );

    return {
      ...resources,
      pending: {
        gold: generatedGold,
        elixir: generatedElixir,
      },
      capacity: {
        gold: maxGold,
        elixir: maxElixir,
      },
    };
  }

  @Post('collect')
  @ApiOperation({ summary: 'Collect generated resources' })
  @ApiResponse({ status: 200, description: 'Resources collected' })
  @ApiResponse({ status: 404, description: 'Village or resources not found' })
  async collectResources(@Req() req) {
    const updatedResources = await this.resourcesService.collectResources(req.user.userId);

    return {
      message: 'Resources collected successfully',
      resources: updatedResources,
    };
  }
}
