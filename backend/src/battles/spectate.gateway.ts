import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { BattleSessionManager } from './battle-session.manager';

export interface BattleEvent {
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED' | 'BATTLE_END';
  timestamp: number;
  data: any;
}

/**
 * Public spectator WebSocket gateway
 * No authentication required - anyone can watch battles
 * Read-only: spectators cannot deploy troops or interact with battles
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/spectate',
})
export class SpectateGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track which spectators are in which battles
  private spectatorBattles = new Map<string, string>(); // socketId -> battleId
  private battleSpectators = new Map<string, Set<string>>(); // battleId -> Set<socketId>

  constructor(
    @Inject(forwardRef(() => BattleSessionManager))
    private battleSessionManager: BattleSessionManager,
  ) {
    // Don't set gateway here - server isn't initialized yet!
  }

  /**
   * Called after WebSocket server is initialized
   * This is when this.server is available
   */
  afterInit(server: Server) {
    console.log('[Spectate] WebSocket server initialized on /spectate namespace');
    // NOW set the gateway reference - server is ready
    this.battleSessionManager.setSpectateGateway(this);
  }

  handleConnection(client: Socket) {
    console.log(`[Spectate] Client connected: ${client.id}`);

    // Ensure gateway is registered with session manager (failsafe if afterInit wasn't called)
    if (this.battleSessionManager) {
      this.battleSessionManager.setSpectateGateway(this);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Spectate] Client disconnected: ${client.id}`);

    // Clean up spectator from battle rooms
    const battleId = this.spectatorBattles.get(client.id);
    if (battleId) {
      const spectators = this.battleSpectators.get(battleId);
      if (spectators) {
        spectators.delete(client.id);
        if (spectators.size === 0) {
          this.battleSpectators.delete(battleId);
        }
      }
      this.spectatorBattles.delete(client.id);
    }
  }

  /**
   * Join a battle as a spectator (public, no auth required)
   */
  @SubscribeMessage('joinBattle')
  async handleJoinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const { battleId } = payload;

    console.log(`[Spectate] Client ${client.id} joining battle ${battleId} as spectator`);

    // Get battle session to send initial state
    const session = this.battleSessionManager.getSession(battleId);
    console.log(`[Spectate] Session found: ${!!session}, Troops count: ${session?.troops?.length || 0}, Buildings count: ${session?.buildings?.length || 0}`);
    if (session && session.troops.length > 0) {
      console.log(`[Spectate] First troop:`, {
        id: session.troops[0].id,
        type: session.troops[0].type,
        position: session.troops[0].position,
        health: session.troops[0].health,
        isAlive: session.troops[0].isAlive,
      });
    }

    // Join the socket.io room
    client.join(battleId);

    // Track the connection
    this.spectatorBattles.set(client.id, battleId);
    if (!this.battleSpectators.has(battleId)) {
      this.battleSpectators.set(battleId, new Set());
    }
    this.battleSpectators.get(battleId)!.add(client.id);

    console.log(`[Spectate] Client ${client.id} joined battle ${battleId}. Total spectators: ${this.battleSpectators.get(battleId)!.size}`);

    // Return battle session data for spectators to render
    const response = {
      success: true,
      message: 'Joined battle as spectator',
      isSpectator: true,
      session: session ? {
        id: session.id,
        status: session.status,
        buildings: session.buildings.map((b) => ({
          id: b.id,
          type: b.type,
          position: b.position,
          health: b.health,
          maxHealth: b.maxHealth,
          isDestroyed: b.isDestroyed,
        })),
        troops: session.troops.map((t) => ({
          id: t.id,
          type: t.type,
          position: t.position,
          health: t.health,
          maxHealth: t.maxHealth,
        })),
        destructionPercentage: session.destructionPercentage,
      } : null,
    };

    console.log(`[Spectate] Sending response with ${response.session?.troops?.length || 0} troops and ${response.session?.buildings?.length || 0} buildings`);

    return response;
  }

  /**
   * Leave a battle room
   */
  @SubscribeMessage('leaveBattle')
  async handleLeaveBattle(@ConnectedSocket() client: Socket) {
    const battleId = this.spectatorBattles.get(client.id);

    if (battleId) {
      client.leave(battleId);

      const spectators = this.battleSpectators.get(battleId);
      if (spectators) {
        spectators.delete(client.id);
      }
      this.spectatorBattles.delete(client.id);

      console.log(`[Spectate] Client ${client.id} left battle ${battleId}`);
    }

    return { success: true };
  }

  /**
   * Broadcast a battle event to all spectators in a battle room
   */
  broadcastBattleEvent(battleId: string, event: BattleEvent) {
    const spectatorCount = this.battleSpectators.get(battleId)?.size || 0;
    console.log(`[Spectate] Broadcasting ${event.type} to battle ${battleId} (${spectatorCount} spectators)`);
    this.server.to(battleId).emit('battleEvent', event);
  }

  /**
   * Broadcast battle end event to spectators
   */
  broadcastBattleEnd(battleId: string, result: any) {
    console.log(`[Spectate] Broadcasting battle end to ${battleId}`);
    this.server.to(battleId).emit('battleEnd', result);
  }

  /**
   * Get number of spectators in a battle
   */
  getSpectatorCount(battleId: string): number {
    return this.battleSpectators.get(battleId)?.size || 0;
  }

  /**
   * Get all spectators in a battle
   */
  getBattleSpectators(battleId: string): string[] {
    const spectators = this.battleSpectators.get(battleId);
    return spectators ? Array.from(spectators) : [];
  }
}
