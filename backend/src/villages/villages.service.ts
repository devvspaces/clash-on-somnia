import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { villages, resources, buildings, Village, NewVillage } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';

@Injectable()
export class VillagesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async createInitialVillage(userId: string, villageName: string): Promise<Village> {
    // Create village
    const [village] = await this.db
      .insert(villages)
      .values({
        userId,
        name: villageName,
        trophies: 0,
      })
      .returning();

    // Create initial resources
    await this.db.insert(resources).values({
      villageId: village.id,
      gold: 1000,
      elixir: 1000,
    });

    // Create initial buildings
    const initialBuildings = [
      // Town Hall at center
      {
        villageId: village.id,
        type: BuildingType.TOWN_HALL,
        level: 1,
        positionX: 18,
        positionY: 18,
        health: getBuildingConfig(BuildingType.TOWN_HALL).maxHealth,
        maxHealth: getBuildingConfig(BuildingType.TOWN_HALL).maxHealth,
        isActive: true,
      },
      // 2 Gold Mines
      {
        villageId: village.id,
        type: BuildingType.GOLD_MINE,
        level: 1,
        positionX: 10,
        positionY: 15,
        health: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
        maxHealth: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
        isActive: true,
      },
      {
        villageId: village.id,
        type: BuildingType.GOLD_MINE,
        level: 1,
        positionX: 10,
        positionY: 22,
        health: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
        maxHealth: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
        isActive: true,
      },
      // 2 Elixir Collectors
      {
        villageId: village.id,
        type: BuildingType.ELIXIR_COLLECTOR,
        level: 1,
        positionX: 28,
        positionY: 15,
        health: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
        maxHealth: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
        isActive: true,
      },
      {
        villageId: village.id,
        type: BuildingType.ELIXIR_COLLECTOR,
        level: 1,
        positionX: 28,
        positionY: 22,
        health: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
        maxHealth: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
        isActive: true,
      },
    ];

    await this.db.insert(buildings).values(initialBuildings);

    return village;
  }

  async findByUserId(userId: string): Promise<Village | null> {
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.userId, userId))
      .limit(1);
    return village || null;
  }

  async findById(villageId: string): Promise<Village | null> {
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.id, villageId))
      .limit(1);
    return village || null;
  }

  async getVillageWithDetails(userId: string) {
    const village = await this.findByUserId(userId);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    // Get resources
    const [villageResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, village.id))
      .limit(1);

    // Get buildings
    const villageBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, village.id));

    return {
      ...village,
      resources: villageResources,
      buildings: villageBuildings,
    };
  }
}
