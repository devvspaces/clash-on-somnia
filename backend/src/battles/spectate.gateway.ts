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
  }

  handleDisconnect(client: Socket) {
    console.log(`[Spectate] Client disconnected: ${client.id}`);

    const battleId = this.spectatorBattles.get(client.id);
    if (battleId) {
      // Remove from battle spectators
      this.battleSpectators.get(battleId)?.delete(client.id);
      this.spectatorBattles.delete(client.id);

      console.log(`[Spectate] Client ${client.id} left battle ${battleId}. Remaining spectators: ${this.battleSpectators.get(battleId)?.size || 0}`);

      // Clean up empty sets
      if (this.battleSpectators.get(battleId)?.size === 0) {
        this.battleSpectators.delete(battleId);
      }
    }
  }

  /**
   * Join a battle as a spectator
   */
  @SubscribeMessage('joinBattle')
  async handleJoinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const { battleId } = payload;

    console.log(`[Spectate] Client ${client.id} joining battle ${battleId} as spectator`);

    // Join the socket.io room
    client.join(battleId);

    // Track the connection
    this.spectatorBattles.set(client.id, battleId);
    if (!this.battleSpectators.has(battleId)) {
      this.battleSpectators.set(battleId, new Set());
    }
    this.battleSpectators.get(battleId)!.add(client.id);

    console.log(`[Spectate] Client ${client.id} joined battle ${battleId}. Total spectators: ${this.battleSpectators.get(battleId)!.size}`);

    // Get battle session to send initial state
    const session = this.battleSessionManager.getSession(battleId);
    if (!session) {
      return {
        success: false,
        message: 'Battle not found or has ended',
        error: 'BATTLE_NOT_FOUND',
      };
    }

    return {
      success: true,
      message: 'Joined battle as spectator',
      isSpectator: true,
      session: {
        buildings: session.buildings.map(b => ({
          id: b.id,
          type: b.type,
          position: b.position,
          health: b.health,
        })),
        troops: session.troops.map(t => ({
          id: t.id,
          type: t.type,
          position: t.position,
          health: t.health,
        })),
      },
    };
  }

  /**
   * Leave a battle
   */
  @SubscribeMessage('leaveBattle')
  handleLeaveBattle(@ConnectedSocket() client: Socket) {
    const battleId = this.spectatorBattles.get(client.id);
    if (battleId) {
      client.leave(battleId);
      this.battleSpectators.get(battleId)?.delete(client.id);
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
    const spectatorCount = this.battleSpectators.get(battleId)?.size || 0;
    console.log(`[Spectate] Broadcasting BATTLE_END to battle ${battleId} (${spectatorCount} spectators)`);
    this.server.to(battleId).emit('battleEnd', result);
  }
}
