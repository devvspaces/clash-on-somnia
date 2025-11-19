import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../database/schema';
import { battles, Battle, NewBattle } from '../database/schema/battles.schema';
import { buildings } from '../database/schema/buildings.schema';
import { villages } from '../database/schema/villages.schema';
import { resources } from '../database/schema/resources.schema';
import { army } from '../database/schema/army.schema';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';
import { TroopType, getTroopConfig, TroopStats } from '../common/config/troops.config';

// Battle event types for replay
interface BattleEvent {
  timestamp: number; // milliseconds since battle start
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED';
  data: any;
}

// Active entities during battle simulation
interface BattleTroop {
  id: string;
  type: TroopType;
  stats: TroopStats;
  health: number;
  position: { x: number; y: number };
  target: string | null; // building ID
  isAlive: boolean;
  spawnTime: number;
}

interface BattleBuilding {
  id: string;
  type: BuildingType;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isDestroyed: boolean;
  defense?: {
    damage: number;
    range: number;
    attackSpeed: number;
    lastAttackTime: number;
    target: string | null; // troop ID
  };
}

interface BattleResult {
  destructionPercentage: number;
  stars: number;
  lootGold: number;
  lootElixir: number;
  battleLog: BattleEvent[];
  victory: boolean;
}

@Injectable()
export class BattlesService {
  constructor(
    @Inject('DB_PROD')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Simulate a battle between attacker's troops and defender's village
   */
  async simulateBattle(
    attackerVillageId: string,
    defenderVillageId: string,
    attackerTroops: { type: TroopType; count: number }[],
  ): Promise<BattleResult> {
    // Load defender's buildings
    const defenderBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, defenderVillageId));

    // Initialize battle state
    const battleBuildings: BattleBuilding[] = defenderBuildings.map((b) => {
      const config = getBuildingConfig(b.type as BuildingType);
      return {
        id: b.id,
        type: b.type as BuildingType,
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        position: { x: b.positionX, y: b.positionY },
        size: { width: config.size.width, height: config.size.height },
        isDestroyed: false,
        defense: config.defense
          ? {
              ...config.defense,
              lastAttackTime: 0,
              target: null,
            }
          : undefined,
      };
    });

    const battleTroops: BattleTroop[] = [];
    const battleLog: BattleEvent[] = [];

    // Spawn troops at random positions on the edge
    let troopIdCounter = 0;
    let spawnTime = 0;
    for (const troopGroup of attackerTroops) {
      const stats = getTroopConfig(troopGroup.type);
      for (let i = 0; i < troopGroup.count; i++) {
        const spawnPosition = this.getRandomSpawnPosition();
        const troop: BattleTroop = {
          id: `troop_${troopIdCounter++}`,
          type: troopGroup.type,
          stats,
          health: stats.health,
          position: spawnPosition,
          target: null,
          isAlive: true,
          spawnTime,
        };
        battleTroops.push(troop);
        battleLog.push({
          timestamp: spawnTime,
          type: 'TROOP_SPAWN',
          data: { troopId: troop.id, type: troopGroup.type, position: spawnPosition },
        });
        spawnTime += 200; // 200ms between each troop spawn
      }
    }

    // Simulate battle (tick-based, 100ms per tick, max 3 minutes)
    const TICK_DURATION = 100; // ms
    const MAX_BATTLE_TIME = 180000; // 3 minutes
    let currentTime = 0;

    while (currentTime < MAX_BATTLE_TIME) {
      const aliveTroops = battleTroops.filter((t) => t.isAlive && t.spawnTime <= currentTime);
      const aliveBuildings = battleBuildings.filter((b) => !b.isDestroyed);

      // Battle ends if all troops are dead or all buildings destroyed
      if (aliveTroops.length === 0 || aliveBuildings.length === 0) {
        break;
      }

      // Troops attack buildings
      for (const troop of aliveTroops) {
        // Find target if troop doesn't have one
        if (!troop.target || battleBuildings.find((b) => b.id === troop.target)?.isDestroyed) {
          troop.target = this.findTarget(troop, aliveBuildings);
        }

        if (troop.target) {
          const targetBuilding = battleBuildings.find((b) => b.id === troop.target);
          if (targetBuilding && !targetBuilding.isDestroyed) {
            const distance = this.calculateDistance(troop.position, targetBuilding.position);

            // Move towards target
            if (distance > troop.stats.range) {
              this.moveTroopTowards(troop, targetBuilding.position, TICK_DURATION);
            } else {
              // Attack
              const damage = troop.stats.damage * (troop.stats.attackSpeed * (TICK_DURATION / 1000));
              targetBuilding.health -= damage;

              battleLog.push({
                timestamp: currentTime,
                type: 'TROOP_ATTACK',
                data: {
                  troopId: troop.id,
                  buildingId: targetBuilding.id,
                  damage: damage,
                  buildingHealth: Math.max(0, targetBuilding.health),
                },
              });

              // Check if building is destroyed
              if (targetBuilding.health <= 0) {
                targetBuilding.isDestroyed = true;
                targetBuilding.health = 0;
                battleLog.push({
                  timestamp: currentTime,
                  type: 'BUILDING_DESTROYED',
                  data: { buildingId: targetBuilding.id, type: targetBuilding.type },
                });
              }
            }
          }
        }
      }

      // Buildings attack troops
      for (const building of aliveBuildings.filter((b) => b.defense)) {
        const defense = building.defense!;

        // Can attack?
        if (currentTime - defense.lastAttackTime >= defense.attackSpeed * 1000) {
          // Find target
          if (!defense.target || !aliveTroops.find((t) => t.id === defense.target)) {
            defense.target = this.findNearestTroop(building, aliveTroops, defense.range);
          }

          if (defense.target) {
            const targetTroop = battleTroops.find((t) => t.id === defense.target);
            if (targetTroop && targetTroop.isAlive) {
              const distance = this.calculateDistance(building.position, targetTroop.position);

              if (distance <= defense.range) {
                targetTroop.health -= defense.damage;
                defense.lastAttackTime = currentTime;

                battleLog.push({
                  timestamp: currentTime,
                  type: 'BUILDING_ATTACK',
                  data: {
                    buildingId: building.id,
                    troopId: targetTroop.id,
                    damage: defense.damage,
                    troopHealth: Math.max(0, targetTroop.health),
                  },
                });

                // Check if troop died
                if (targetTroop.health <= 0) {
                  targetTroop.isAlive = false;
                  targetTroop.health = 0;
                  battleLog.push({
                    timestamp: currentTime,
                    type: 'TROOP_DEATH',
                    data: { troopId: targetTroop.id, type: targetTroop.type },
                  });
                }
              }
            }
          }
        }
      }

      currentTime += TICK_DURATION;
    }

    // Calculate results
    const totalBuildings = battleBuildings.length;
    const destroyedBuildings = battleBuildings.filter((b) => b.isDestroyed).length;
    const destructionPercentage = Math.floor((destroyedBuildings / totalBuildings) * 100);

    // Calculate stars (CoC style: 50% = 1 star, 100% = 2 stars, Town Hall = +1 star)
    let stars = 0;
    if (destructionPercentage >= 50) stars = 1;
    if (destructionPercentage === 100) stars = 2;
    const townHallDestroyed = battleBuildings.find(
      (b) => b.type === BuildingType.TOWN_HALL && b.isDestroyed,
    );
    if (townHallDestroyed) stars += 1;
    stars = Math.min(stars, 3);

    // Calculate loot
    const { lootGold, lootElixir } = await this.calculateLoot(
      defenderVillageId,
      destructionPercentage,
    );

    return {
      destructionPercentage,
      stars,
      lootGold,
      lootElixir,
      battleLog,
      victory: stars > 0,
    };
  }

  /**
   * Find target building based on troop preferences
   */
  private findTarget(troop: BattleTroop, buildings: BattleBuilding[]): string | null {
    const preference = troop.stats.targetPreference;
    let candidates = buildings.filter((b) => !b.isDestroyed);

    // Filter by preference
    if (preference === 'DEFENSES') {
      const defenseBuildings = candidates.filter((b) => b.defense);
      if (defenseBuildings.length > 0) candidates = defenseBuildings;
    } else if (preference === 'WALLS') {
      const walls = candidates.filter((b) => b.type === BuildingType.WALL);
      if (walls.length > 0) candidates = walls;
    }

    // Find nearest
    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    let minDistance = this.calculateDistance(troop.position, nearest.position);

    for (const building of candidates.slice(1)) {
      const distance = this.calculateDistance(troop.position, building.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = building;
      }
    }

    return nearest.id;
  }

  /**
   * Find nearest troop in range for building defense
   */
  private findNearestTroop(
    building: BattleBuilding,
    troops: BattleTroop[],
    range: number,
  ): string | null {
    let nearest: BattleTroop | null = null;
    let minDistance = Infinity;

    for (const troop of troops.filter((t) => t.isAlive)) {
      const distance = this.calculateDistance(building.position, troop.position);
      if (distance <= range && distance < minDistance) {
        minDistance = distance;
        nearest = troop;
      }
    }

    return nearest?.id || null;
  }

  /**
   * Move troop towards target position
   */
  private moveTroopTowards(
    troop: BattleTroop,
    targetPosition: { x: number; y: number },
    tickDuration: number,
  ): void {
    const dx = targetPosition.x - troop.position.x;
    const dy = targetPosition.y - troop.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const moveDistance = troop.stats.moveSpeed * (tickDuration / 1000);
    const ratio = Math.min(moveDistance / distance, 1);

    troop.position.x += dx * ratio;
    troop.position.y += dy * ratio;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
  ): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get random spawn position (edge of map)
   */
  private getRandomSpawnPosition(): { x: number; y: number } {
    const MAP_SIZE = 40;
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left

    switch (edge) {
      case 0: // top
        return { x: Math.random() * MAP_SIZE, y: 0 };
      case 1: // right
        return { x: MAP_SIZE, y: Math.random() * MAP_SIZE };
      case 2: // bottom
        return { x: Math.random() * MAP_SIZE, y: MAP_SIZE };
      case 3: // left
        return { x: 0, y: Math.random() * MAP_SIZE };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Calculate loot based on destruction percentage
   */
  private async calculateLoot(
    defenderVillageId: string,
    destructionPercentage: number,
  ): Promise<{ lootGold: number; lootElixir: number }> {
    // Get defender's resources
    const [defenderResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, defenderVillageId))
      .limit(1);

    if (!defenderResources) {
      return { lootGold: 0, lootElixir: 0 };
    }

    // Loot formula: percentage of available resources based on destruction
    // Max loot: 20% of available resources at 100% destruction
    const lootPercentage = (destructionPercentage / 100) * 0.2; // 0% to 20%

    const lootGold = Math.floor(defenderResources.gold * lootPercentage);
    const lootElixir = Math.floor(defenderResources.elixir * lootPercentage);

    return { lootGold, lootElixir };
  }

  /**
   * Create a battle record and distribute loot
   */
  async createBattle(
    attackerId: string,
    defenderId: string,
    attackerTroops: { type: TroopType; count: number }[],
  ): Promise<Battle> {
    // Simulate battle
    const result = await this.simulateBattle(attackerId, defenderId, attackerTroops);

    // Create battle record
    const [battle] = await this.db
      .insert(battles)
      .values({
        attackerId,
        defenderId,
        attackerTroops: attackerTroops as any,
        destructionPercentage: result.destructionPercentage,
        stars: result.stars,
        lootGold: result.lootGold,
        lootElixir: result.lootElixir,
        battleLog: result.battleLog as any,
        status: 'completed',
      })
      .returning();

    // Give loot to attacker
    await this.db
      .update(resources)
      .set({
        gold: result.lootGold,
        elixir: result.lootElixir,
      })
      .where(eq(resources.villageId, attackerId));

    return battle;
  }

  /**
   * Get battle history for a village
   */
  async getBattleHistory(villageId: string, limit: number = 20): Promise<Battle[]> {
    const history = await this.db
      .select()
      .from(battles)
      .where(
        and(
          eq(battles.attackerId, villageId),
        ),
      )
      .orderBy(desc(battles.createdAt))
      .limit(limit);

    return history;
  }

  /**
   * Get a single battle by ID
   */
  async getBattleById(battleId: string): Promise<Battle | null> {
    const [battle] = await this.db
      .select()
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1);

    return battle || null;
  }

  /**
   * Find a random opponent village (for PvE)
   */
  async findRandomOpponent(attackerVillageId: string): Promise<string | null> {
    // Get all villages except attacker's
    const opponents = await this.db
      .select()
      .from(villages)
      .where(eq(villages.id, attackerVillageId));

    if (opponents.length === 0) return null;

    // Return random opponent
    const randomIndex = Math.floor(Math.random() * opponents.length);
    return opponents[randomIndex].id;
  }
}
