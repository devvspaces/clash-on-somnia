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
import { AttackDto } from './dto/attack.dto';

@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  /**
   * GET /battles/public/recent
   * Get recent battles (public, no auth required)
   * For landing page spectator view
   */
  @Get('public/recent')
  async getRecentBattles(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const battles = await this.battlesService.getAllRecentBattles(limitNum);

    return {
      battles: battles.map((battle) => ({
        id: battle.id,
        attackerVillage: battle.attackerVillage,
        defenderVillage: battle.defenderVillage,
        attackerTroops: battle.attackerTroops,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }

  /**
   * POST /battles/attack
   * Start an attack against a defender village
   */
  @Post('attack')
  @UseGuards(JwtAuthGuard)
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
   * POST /battles/start
   * Start a real-time battle session
   */
  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startBattle(@Request() req, @Body() body: { defenderId: string; troops: { type: TroopType; count: number }[] }) {
    const userId = req.user.userId;
    const attackerVillageId = req.user.villageId;

    console.log('Starting battle:', { userId, attackerVillageId, defenderId: body.defenderId });

    if (!body.defenderId || !body.troops || body.troops.length === 0) {
      throw new BadRequestException('Invalid battle data: defenderId and troops are required');
    }

    // Validate troop types
    for (const troop of body.troops) {
      if (!Object.values(TroopType).includes(troop.type)) {
        throw new BadRequestException(`Invalid troop type: ${troop.type}`);
      }
      if (troop.count <= 0) {
        throw new BadRequestException(`Troop count must be positive: ${troop.type}`);
      }
    }

    // TODO: Validate that attacker has these troops available
    // TODO: Deduct troops from attacker's army

    const result = await this.battlesService.startBattle(
      userId,
      attackerVillageId,
      body.defenderId,
      body.troops,
    );

    return {
      message: 'Battle session created',
      ...result,
    };
  }

  /**
   * GET /battles/find-opponent
   * Find a random opponent to attack
   */
  @Get('find-opponent')
  @UseGuards(JwtAuthGuard)
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
   * GET /battles/defenses
   * Get defense history for the current user (attacks against user's village)
   */
  @Get('defenses')
  @UseGuards(JwtAuthGuard)
  async getDefenses(@Request() req, @Query('limit') limit?: string) {
    const villageId = req.user.villageId;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    console.log('getDefenses - villageId:', villageId, 'limit:', limitNum);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const history = await this.battlesService.getDefenseHistory(villageId, limitNum);

    return {
      battles: history.map((battle) => ({
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }

  /**
   * GET /battles/:id
   * Get battle details and replay data
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
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
   * GET /battles
   * Get battle history for the current user (attacks made by user)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
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
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }
}
