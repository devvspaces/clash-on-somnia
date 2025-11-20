import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattlesService } from './battles.service';
import { TroopType } from '../common/config/troops.config';

class AttackDto {
  defenderId: string;
  troops: { type: TroopType; count: number }[];
}

@Controller('battles')
@UseGuards(JwtAuthGuard)
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  /**
   * POST /battles/attack
   * Start an attack against a defender village
   */
  @Post('attack')
  async attack(@Request() req, @Body() attackDto: AttackDto) {
    const attackerVillageId = req.user.villageId;

    if (!attackDto.defenderId || !attackDto.troops || attackDto.troops.length === 0) {
      throw new BadRequestException('Invalid attack data: defenderId and troops are required');
    }

    // Validate troop types
    for (const troop of attackDto.troops) {
      if (!Object.values(TroopType).includes(troop.type)) {
        throw new BadRequestException(`Invalid troop type: ${troop.type}`);
      }
      if (troop.count <= 0) {
        throw new BadRequestException(`Troop count must be positive: ${troop.type}`);
      }
    }

    // TODO: Validate that attacker has these troops available
    // TODO: Deduct troops from attacker's army

    const battle = await this.battlesService.createBattle(
      attackerVillageId,
      attackDto.defenderId,
      attackDto.troops,
    );

    return {
      message: 'Battle completed',
      battle: {
        id: battle.id,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        createdAt: battle.createdAt,
      },
    };
  }

  /**
   * GET /battles/find-opponent
   * Find a random opponent to attack
   */
  @Get('find-opponent')
  async findOpponent(@Request() req) {
    const villageId = req.user.villageId;

    console.log('Find opponent - villageId:', villageId);
    console.log('Find opponent - user:', req.user);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const opponentId = await this.battlesService.findRandomOpponent(villageId);

    if (!opponentId) {
      throw new NotFoundException('No opponents found');
    }

    // TODO: Load opponent village details (buildings, resources, etc.)
    return {
      opponentVillageId: opponentId,
      message: 'Opponent found',
    };
  }

  /**
   * GET /battles/:id
   * Get battle details and replay data
   */
  @Get(':id')
  async getBattle(@Request() req, @Param('id') battleId: string) {
    const battle = await this.battlesService.getBattleById(battleId);

    if (!battle) {
      throw new NotFoundException('Battle not found');
    }

    // Ensure user has access to this battle (either attacker or defender)
    const userVillageId = req.user.villageId;
    if (battle.attackerId !== userVillageId && battle.defenderId !== userVillageId) {
      throw new NotFoundException('Battle not found');
    }

    return {
      battle: {
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        attackerTroops: battle.attackerTroops,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        battleLog: battle.battleLog,
        createdAt: battle.createdAt,
      },
    };
  }

  /**
   * GET /battles/history
   * Get battle history for the current user
   */
  @Get()
  async getHistory(@Request() req, @Query('limit') limit?: string) {
    const villageId = req.user.villageId;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    console.log('getHistory - villageId:', villageId, 'limit:', limitNum);
    console.log('getHistory - user:', req.user);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const history = await this.battlesService.getBattleHistory(villageId, limitNum);

    return {
      battles: history.map((battle) => ({
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        createdAt: battle.createdAt,
      })),
    };
  }
}
