import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { resources, buildings, villages, Resource } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async getResourcesByVillageId(villageId: string): Promise<Resource | null> {
    const [villageResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, villageId))
      .limit(1);
    return villageResources || null;
  }

  async getResourcesByUserId(userId: string): Promise<Resource> {
    // Get user's village
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.userId, userId))
      .limit(1);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    const villageResources = await this.getResourcesByVillageId(village.id);

    if (!villageResources) {
      throw new NotFoundException('Resources not found');
    }

    return villageResources;
  }

  async collectResources(userId: string): Promise<Resource> {
    // Get user's village
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.userId, userId))
      .limit(1);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    // Get current resources
    const currentResources = await this.getResourcesByVillageId(village.id);
    if (!currentResources) {
      throw new NotFoundException('Resources not found');
    }

    // Calculate generated resources since last collection
    const { generatedGold, generatedElixir } = await this.calculateGeneratedResources(village.id);

    // Get storage capacities
    const { maxGold, maxElixir } = await this.getStorageCapacities(village.id);

    // Calculate new totals (capped by storage)
    const newGold = Math.min(currentResources.gold + generatedGold, maxGold);
    const newElixir = Math.min(currentResources.elixir + generatedElixir, maxElixir);

    // Update resources
    const [updatedResources] = await this.db
      .update(resources)
      .set({
        gold: newGold,
        elixir: newElixir,
        lastCollectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resources.villageId, village.id))
      .returning();

    return updatedResources;
  }

  async calculateGeneratedResources(
    villageId: string,
  ): Promise<{ generatedGold: number; generatedElixir: number }> {
    // Get all resource buildings for this village
    const villageBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, villageId));

    const goldMines = villageBuildings.filter((b) => b.type === BuildingType.GOLD_MINE);
    const elixirCollectors = villageBuildings.filter(
      (b) => b.type === BuildingType.ELIXIR_COLLECTOR,
    );

    // Calculate gold generation
    let totalGoldRate = 0;
    for (const mine of goldMines) {
      const config = getBuildingConfig(BuildingType.GOLD_MINE);
      totalGoldRate += config.generationRate || 0;
    }

    // Calculate elixir generation
    let totalElixirRate = 0;
    for (const collector of elixirCollectors) {
      const config = getBuildingConfig(BuildingType.ELIXIR_COLLECTOR);
      totalElixirRate += config.generationRate || 0;
    }

    // Get current resources to check last collection time
    const [currentResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, villageId))
      .limit(1);

    if (!currentResources) {
      return { generatedGold: 0, generatedElixir: 0 };
    }

    // Calculate time elapsed since last collection (in hours)
    const now = new Date();
    const lastCollected = new Date(currentResources.lastCollectedAt);
    const hoursElapsed = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);

    // Calculate generated resources
    const generatedGold = Math.floor(totalGoldRate * hoursElapsed);
    const generatedElixir = Math.floor(totalElixirRate * hoursElapsed);

    return { generatedGold, generatedElixir };
  }

  async getStorageCapacities(villageId: string): Promise<{ maxGold: number; maxElixir: number }> {
    const villageBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, villageId));

    // Base storage from Town Hall
    let maxGold = 1000;
    let maxElixir = 1000;

    // Add storage from Gold Storage buildings
    const goldStorages = villageBuildings.filter((b) => b.type === BuildingType.GOLD_STORAGE);
    for (const storage of goldStorages) {
      const config = getBuildingConfig(BuildingType.GOLD_STORAGE);
      maxGold += config.capacity || 0;
    }

    // Add storage from Elixir Storage buildings
    const elixirStorages = villageBuildings.filter((b) => b.type === BuildingType.ELIXIR_STORAGE);
    for (const storage of elixirStorages) {
      const config = getBuildingConfig(BuildingType.ELIXIR_STORAGE);
      maxElixir += config.capacity || 0;
    }

    return { maxGold, maxElixir };
  }

  async spendResources(
    villageId: string,
    goldCost: number,
    elixirCost: number,
  ): Promise<Resource> {
    const currentResources = await this.getResourcesByVillageId(villageId);

    if (!currentResources) {
      throw new NotFoundException('Resources not found');
    }

    if (currentResources.gold < goldCost || currentResources.elixir < elixirCost) {
      throw new BadRequestException('Insufficient resources');
    }

    const [updatedResources] = await this.db
      .update(resources)
      .set({
        gold: currentResources.gold - goldCost,
        elixir: currentResources.elixir - elixirCost,
        updatedAt: new Date(),
      })
      .where(eq(resources.villageId, villageId))
      .returning();

    return updatedResources;
  }

  // Background job to auto-collect resources every hour
  @Cron(CronExpression.EVERY_HOUR)
  async autoCollectResources() {
    console.log('Running auto-collect resources job...');

    // Get all villages
    const allVillages = await this.db.select().from(villages);

    for (const village of allVillages) {
      try {
        const currentResources = await this.getResourcesByVillageId(village.id);
        if (!currentResources) continue;

        // Calculate generated resources
        const { generatedGold, generatedElixir } =
          await this.calculateGeneratedResources(village.id);

        // Only update if there are generated resources
        if (generatedGold > 0 || generatedElixir > 0) {
          const { maxGold, maxElixir } = await this.getStorageCapacities(village.id);

          const newGold = Math.min(currentResources.gold + generatedGold, maxGold);
          const newElixir = Math.min(currentResources.elixir + generatedElixir, maxElixir);

          await this.db
            .update(resources)
            .set({
              gold: newGold,
              elixir: newElixir,
              updatedAt: new Date(),
            })
            .where(eq(resources.villageId, village.id));

          console.log(
            `Auto-collected for village ${village.id}: +${generatedGold} gold, +${generatedElixir} elixir`,
          );
        }
      } catch (error) {
        console.error(`Error auto-collecting for village ${village.id}:`, error);
      }
    }

    console.log('Auto-collect resources job completed');
  }
}
