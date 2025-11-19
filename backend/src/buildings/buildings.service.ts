import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { villages, buildings } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';

@Injectable()
export class BuildingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async addStarterBuildingsToVillage(villageId: string) {
    // Check what buildings already exist
    const existingBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, villageId));

    const hasGoldMine = existingBuildings.some((b) => b.type === BuildingType.GOLD_MINE);
    const hasElixirCollector = existingBuildings.some(
      (b) => b.type === BuildingType.ELIXIR_COLLECTOR,
    );

    const newBuildings = [];

    // Add Gold Mines if they don't exist
    if (!hasGoldMine) {
      newBuildings.push(
        {
          villageId,
          type: BuildingType.GOLD_MINE,
          level: 1,
          positionX: 10,
          positionY: 15,
          health: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
          maxHealth: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
          isActive: true,
        },
        {
          villageId,
          type: BuildingType.GOLD_MINE,
          level: 1,
          positionX: 10,
          positionY: 22,
          health: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
          maxHealth: getBuildingConfig(BuildingType.GOLD_MINE).maxHealth,
          isActive: true,
        },
      );
    }

    // Add Elixir Collectors if they don't exist
    if (!hasElixirCollector) {
      newBuildings.push(
        {
          villageId,
          type: BuildingType.ELIXIR_COLLECTOR,
          level: 1,
          positionX: 28,
          positionY: 15,
          health: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
          maxHealth: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
          isActive: true,
        },
        {
          villageId,
          type: BuildingType.ELIXIR_COLLECTOR,
          level: 1,
          positionX: 28,
          positionY: 22,
          health: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
          maxHealth: getBuildingConfig(BuildingType.ELIXIR_COLLECTOR).maxHealth,
          isActive: true,
        },
      );
    }

    if (newBuildings.length > 0) {
      await this.db.insert(buildings).values(newBuildings);
    }

    return newBuildings.length;
  }

  async migrateAllVillages() {
    const allVillages = await this.db.select().from(villages);

    let totalAdded = 0;
    for (const village of allVillages) {
      const added = await this.addStarterBuildingsToVillage(village.id);
      totalAdded += added;
      console.log(`Added ${added} buildings to village ${village.id}`);
    }

    return { villageCount: allVillages.length, buildingsAdded: totalAdded };
  }
}
