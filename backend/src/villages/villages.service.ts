import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { villages, resources, buildings, Village, NewVillage } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

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
      gold: 500,
      elixir: 500,
    });

    // Create initial buildings (Town Hall at center)
    await this.db.insert(buildings).values({
      villageId: village.id,
      type: 'town_hall',
      level: 1,
      positionX: 20,
      positionY: 20,
      health: 1000,
      maxHealth: 1000,
      isActive: true,
    });

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
