import { Injectable } from '@nestjs/common';
import { BattlesGateway, BattleEvent } from './battles.gateway';

export interface Troop {
  id: string;
  type: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  range: number;
  targetType: 'ground' | 'air' | 'both';
  isAlive: boolean;
  target: Building | null;
  state: 'idle' | 'moving' | 'attacking' | 'dead';
}

export interface Building {
  id: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  isDefense: boolean;
  defense?: {
    damage: number;
    range: number;
    attackSpeed: number;
    targetType: 'ground' | 'air' | 'both';
    lastAttackTime: number;
  };
}

export interface BattleSession {
  id: string;
  attackerId: string;
  attackerVillageId: string;
  defenderId: string;
  defenderVillageId: string;
  troops: Troop[];
  buildings: Building[];
  startTime: number;
  lastTickTime: number;
  tickInterval: number; // milliseconds
  status: 'waiting' | 'active' | 'completed';
  destructionPercentage: number;
  deployedTroopCount: number;
  maxTroops: number;
}

@Injectable()
export class BattleSessionManager {
  private sessions: Map<string, BattleSession> = new Map();
  private gateway: BattlesGateway;

  setGateway(gateway: BattlesGateway) {
    this.gateway = gateway;
  }

  createSession(
    battleId: string,
    attackerId: string,
    attackerVillageId: string,
    defenderId: string,
    defenderVillageId: string,
    buildings: any[],
    maxTroops: number,
  ): BattleSession {
    const session: BattleSession = {
      id: battleId,
      attackerId,
      attackerVillageId,
      defenderId,
      defenderVillageId,
      troops: [],
      buildings: this.convertBuildings(buildings),
      startTime: Date.now(),
      lastTickTime: Date.now(),
      tickInterval: 100, // 100ms ticks (10 ticks per second)
      status: 'waiting',
      destructionPercentage: 0,
      deployedTroopCount: 0,
      maxTroops,
    };

    this.sessions.set(battleId, session);
    console.log(`Created battle session ${battleId}`);
    return session;
  }

  getSession(battleId: string): BattleSession | undefined {
    return this.sessions.get(battleId);
  }

  deleteSession(battleId: string) {
    this.sessions.delete(battleId);
    console.log(`Deleted battle session ${battleId}`);
  }

  deployTroop(
    battleId: string,
    troopType: string,
    position: { x: number; y: number },
    troopStats: any,
  ): Troop | null {
    const session = this.sessions.get(battleId);
    if (!session) {
      return null;
    }

    if (session.deployedTroopCount >= session.maxTroops) {
      console.log(`Cannot deploy more troops, max ${session.maxTroops} reached`);
      return null;
    }

    const troop: Troop = {
      id: `${troopType}_${Date.now()}_${Math.random()}`,
      type: troopType,
      position: { ...position },
      health: troopStats.health,
      maxHealth: troopStats.health,
      damage: troopStats.damage,
      speed: troopStats.speed,
      range: troopStats.range,
      targetType: troopStats.targetType || 'ground',
      isAlive: true,
      target: null,
      state: 'idle',
    };

    session.troops.push(troop);
    session.deployedTroopCount++;

    // Start battle on first troop deployment
    if (session.status === 'waiting') {
      session.status = 'active';
      this.startBattleLoop(battleId);
    }

    return troop;
  }

  private convertBuildings(buildings: any[]): Building[] {
    return buildings.map((b) => ({
      id: b.id,
      type: b.type,
      position: { x: b.positionX || b.x || 0, y: b.positionY || b.y || 0 }, // Handle both positionX/Y and x/y
      width: b.width || b.config?.size?.width || 2,
      height: b.height || b.config?.size?.height || 2,
      health: b.config?.maxHealth || b.health || 1000,
      maxHealth: b.config?.maxHealth || b.health || 1000,
      isDestroyed: false,
      isDefense: !!b.config?.defense,
      defense: b.config?.defense
        ? {
            damage: b.config.defense.damage,
            range: b.config.defense.range,
            attackSpeed: b.config.defense.attackSpeed,
            targetType: b.config.defense.targetType,
            lastAttackTime: 0,
          }
        : undefined,
    }));
  }

  private startBattleLoop(battleId: string) {
    const session = this.sessions.get(battleId);
    if (!session) return;

    console.log(`Starting battle loop for ${battleId}`);

    const tick = () => {
      const currentSession = this.sessions.get(battleId);
      if (!currentSession || currentSession.status !== 'active') {
        return; // Stop loop
      }

      const now = Date.now();
      const deltaTime = (now - currentSession.lastTickTime) / 1000; // seconds
      currentSession.lastTickTime = now;

      // Process battle tick
      this.processBattleTick(currentSession, deltaTime);

      // Check battle end conditions
      if (this.shouldEndBattle(currentSession)) {
        this.endBattle(battleId);
        return;
      }

      // Schedule next tick
      setTimeout(tick, currentSession.tickInterval);
    };

    // Start the loop
    tick();
  }

  private processBattleTick(session: BattleSession, deltaTime: number) {
    // 1. Process troop AI (movement and targeting)
    for (const troop of session.troops) {
      if (!troop.isAlive) continue;

      // Find target if none
      if (!troop.target || troop.target.isDestroyed) {
        troop.target = this.findClosestBuilding(troop, session.buildings);
        troop.state = troop.target ? 'moving' : 'idle';
      }

      if (troop.target) {
        const distance = this.getDistance(troop.position, this.getBuildingCenter(troop.target));

        // If in range, attack
        if (distance <= troop.range) {
          troop.state = 'attacking';
          this.troopAttackBuilding(troop, troop.target, session);
        } else {
          // Move towards target
          troop.state = 'moving';
          this.moveTroopTowards(troop, this.getBuildingCenter(troop.target), deltaTime);
        }
      }
    }

    // 2. Process defense buildings attacking troops
    for (const building of session.buildings) {
      if (building.isDestroyed || !building.isDefense || !building.defense) continue;

      const now = Date.now();
      const timeSinceLastAttack = now - building.defense.lastAttackTime;
      const attackCooldown = (1 / building.defense.attackSpeed) * 1000; // Convert to ms

      if (timeSinceLastAttack >= attackCooldown) {
        const target = this.findClosestTroop(building, session.troops, building.defense.range);
        if (target) {
          this.buildingAttackTroop(building, target, session);
          building.defense.lastAttackTime = now;
        }
      }
    }

    // 3. Remove dead troops
    session.troops = session.troops.filter((t) => t.isAlive);

    // 4. Calculate destruction percentage
    this.updateDestructionPercentage(session);
  }

  private findClosestBuilding(troop: Troop, buildings: Building[]): Building | null {
    const aliveBuildings = buildings.filter((b) => !b.isDestroyed);
    if (aliveBuildings.length === 0) return null;

    let closest = aliveBuildings[0];
    let minDistance = this.getDistance(troop.position, this.getBuildingCenter(closest));

    for (const building of aliveBuildings) {
      const distance = this.getDistance(troop.position, this.getBuildingCenter(building));
      if (distance < minDistance) {
        minDistance = distance;
        closest = building;
      }
    }

    return closest;
  }

  private findClosestTroop(building: Building, troops: Troop[], range: number): Troop | null {
    const buildingCenter = this.getBuildingCenter(building);
    const troopsInRange = troops.filter((t) => {
      if (!t.isAlive) return false;
      const distance = this.getDistance(buildingCenter, t.position);
      return distance <= range;
    });

    if (troopsInRange.length === 0) return null;

    let closest = troopsInRange[0];
    let minDistance = this.getDistance(buildingCenter, closest.position);

    for (const troop of troopsInRange) {
      const distance = this.getDistance(buildingCenter, troop.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = troop;
      }
    }

    return closest;
  }

  private moveTroopTowards(troop: Troop, target: { x: number; y: number }, deltaTime: number) {
    const dx = target.x - troop.position.x;
    const dy = target.y - troop.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
      const moveDistance = troop.speed * deltaTime;
      const ratio = Math.min(moveDistance / distance, 1);

      const oldPosition = { ...troop.position };
      troop.position.x += dx * ratio;
      troop.position.y += dy * ratio;

      // Broadcast movement event (throttled)
      if (Math.random() < 0.1) {
        // 10% chance to broadcast each tick
        this.broadcastEvent(troop, 'TROOP_MOVE', {
          troopId: troop.id,
          from: oldPosition,
          to: troop.position,
        });
      }
    }
  }

  private troopAttackBuilding(troop: Troop, building: Building, session: BattleSession) {
    building.health -= troop.damage;

    if (building.health <= 0 && !building.isDestroyed) {
      building.health = 0;
      building.isDestroyed = true;

      this.broadcastEvent(session, 'BUILDING_DESTROYED', {
        buildingId: building.id,
        buildingType: building.type,
        position: building.position,
      });

      // Troop needs new target
      troop.target = null;
    } else {
      this.broadcastEvent(session, 'BUILDING_ATTACK', {
        troopId: troop.id,
        buildingId: building.id,
        damage: troop.damage,
        remainingHealth: building.health,
      });
    }
  }

  private buildingAttackTroop(building: Building, troop: Troop, session: BattleSession) {
    if (!building.defense) return;

    troop.health -= building.defense.damage;

    if (troop.health <= 0 && troop.isAlive) {
      troop.health = 0;
      troop.isAlive = false;
      troop.state = 'dead';

      this.broadcastEvent(session, 'TROOP_DEATH', {
        troopId: troop.id,
        troopType: troop.type,
        position: troop.position,
        killedBy: building.id,
      });
    } else {
      this.broadcastEvent(session, 'TROOP_ATTACK', {
        buildingId: building.id,
        troopId: troop.id,
        damage: building.defense.damage,
        remainingHealth: troop.health,
        projectile: {
          from: this.getBuildingCenter(building),
          to: troop.position,
        },
      });
    }
  }

  private updateDestructionPercentage(session: BattleSession) {
    if (session.buildings.length === 0) {
      session.destructionPercentage = 100;
      return;
    }

    let totalHealth = 0;
    let remainingHealth = 0;

    for (const building of session.buildings) {
      totalHealth += building.maxHealth;
      remainingHealth += building.health;
    }

    session.destructionPercentage = Math.floor(((totalHealth - remainingHealth) / totalHealth) * 100);
  }

  private shouldEndBattle(session: BattleSession): boolean {
    // Battle ends if:
    // 1. All buildings destroyed (100% destruction)
    if (session.destructionPercentage >= 100) {
      return true;
    }

    // 2. All troops dead and max troops deployed
    const aliveTroops = session.troops.filter((t) => t.isAlive).length;
    if (aliveTroops === 0 && session.deployedTroopCount >= session.maxTroops) {
      return true;
    }

    // 3. Battle timeout (3 minutes)
    const battleDuration = Date.now() - session.startTime;
    if (battleDuration > 3 * 60 * 1000) {
      return true;
    }

    return false;
  }

  private endBattle(battleId: string) {
    const session = this.sessions.get(battleId);
    if (!session) return;

    session.status = 'completed';

    // Calculate stars
    let stars = 0;
    if (session.destructionPercentage >= 50) stars = 1;
    if (session.destructionPercentage >= 70) stars = 2;
    if (session.destructionPercentage >= 100) stars = 3;

    const result = {
      battleId,
      destructionPercentage: session.destructionPercentage,
      stars,
      duration: Date.now() - session.startTime,
    };

    console.log(`Battle ${battleId} ended:`, result);

    this.broadcastEvent(session, 'BATTLE_END', result);

    // Clean up after 30 seconds
    setTimeout(() => {
      this.deleteSession(battleId);
    }, 30000);
  }

  private broadcastEvent(sessionOrTroop: BattleSession | Troop, type: string, data: any) {
    if (!this.gateway) return;

    const battleId = 'id' in sessionOrTroop ? (sessionOrTroop as BattleSession).id : null;
    if (!battleId) return;

    const event: BattleEvent = {
      type: type as any,
      timestamp: Date.now(),
      data,
    };

    this.gateway.broadcastBattleEvent(battleId, event);
  }

  private getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getBuildingCenter(building: Building): { x: number; y: number } {
    return {
      x: building.position.x + building.width / 2,
      y: building.position.y + building.height / 2,
    };
  }
}
