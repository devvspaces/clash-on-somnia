import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { BattleSessionManager } from './battle-session.manager';
import { TROOP_CONFIGS, TroopType } from '../common/config/troops.config';
import { BattlesService } from './battles.service';

export interface BattleEvent {
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED' | 'BATTLE_END';
  timestamp: number;
  data: any;
}

export interface DeployTroopPayload {
  battleId: string;
  troopType: string;
  position: { x: number; y: number };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/battles',
})
export class BattlesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Track which users are in which battles
  private userBattles = new Map<string, string>(); // socketId -> battleId
  private battleRooms = new Map<string, Set<string>>(); // battleId -> Set<socketId>
  // Track user connections for notifications (userId -> Set<socketId>)
  private userConnections = new Map<string, Set<string>>();

  constructor(
    private battleSessionManager: BattleSessionManager,
    @Inject(forwardRef(() => BattlesService))
    private battlesService: BattlesService,
  ) {
    // Set gateway reference in session manager for broadcasting
    this.battleSessionManager.setGateway(this);
  }

  afterInit() {
    console.log('BattlesGateway initialized');
    // Set gateway reference on service
    this.battlesService.setBattlesGateway(this);
  }

  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);

    // Clean up user from battle rooms
    const battleId = this.userBattles.get(client.id);
    if (battleId) {
      const room = this.battleRooms.get(battleId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.battleRooms.delete(battleId);
        }
      }
      this.userBattles.delete(client.id);
    }

    // Clean up from user connections
    const userId = (client as any).userId;
    if (userId) {
      const connections = this.userConnections.get(userId);
      if (connections) {
        connections.delete(client.id);
        if (connections.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }
  }

  /**
   * Join a battle room
   */
  @SubscribeMessage('joinBattle')
  async handleJoinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string; villageId: string },
  ) {
    const { battleId, villageId } = payload;

    console.log(`Client ${client.id} joining battle ${battleId} as village ${villageId}`);

    // Check if battle session exists
    const session = this.battleSessionManager.getSession(battleId);
    if (!session) {
      console.log(`Battle ${battleId} not found - battle may have ended`);
      return {
        success: false,
        message: 'Battle not found or has ended',
        error: 'BATTLE_ENDED'
      };
    }

    // Check if battle is completed
    if (session.status === 'completed') {
      console.log(`Battle ${battleId} has already ended`);
      return {
        success: false,
        message: 'Battle has already ended',
        error: 'BATTLE_ENDED'
      };
    }

    // Join the socket.io room
    client.join(battleId);

    // Track the connection
    this.userBattles.set(client.id, battleId);
    if (!this.battleRooms.has(battleId)) {
      this.battleRooms.set(battleId, new Set());
    }
    this.battleRooms.get(battleId)!.add(client.id);

    // Store villageId and session info on socket for future use
    (client as any).villageId = villageId;
    (client as any).isAttacker = session.attackerVillageId === villageId;

    console.log(`Client ${client.id} joined battle ${battleId} as ${(client as any).isAttacker ? 'attacker' : 'spectator'}`);

    return {
      success: true,
      message: 'Joined battle room',
      isAttacker: (client as any).isAttacker
    };
  }

  /**
   * Leave a battle room
   */
  @SubscribeMessage('leaveBattle')
  async handleLeaveBattle(@ConnectedSocket() client: Socket) {
    const battleId = this.userBattles.get(client.id);

    if (battleId) {
      client.leave(battleId);

      const room = this.battleRooms.get(battleId);
      if (room) {
        room.delete(client.id);
      }
      this.userBattles.delete(client.id);

      console.log(`Client ${client.id} left battle ${battleId}`);
    }

    return { success: true };
  }

  /**
   * Deploy a troop during battle
   */
  @SubscribeMessage('deployTroop')
  @UseGuards(WsJwtGuard)
  async handleDeployTroop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DeployTroopPayload,
  ) {
    const { battleId, troopType, position } = payload;
    const user = (client as any).user;
    const villageId = (client as any).villageId;
    const isAttacker = (client as any).isAttacker;

    console.log(`User ${user?.username} deploying ${troopType} at (${position.x}, ${position.y}) in battle ${battleId}`);

    // Validate battle session exists
    const session = this.battleSessionManager.getSession(battleId);
    if (!session) {
      throw new WsException('Battle session not found');
    }

    // Enforce spectator-only mode - only attacker can deploy troops
    if (!isAttacker || session.attackerVillageId !== villageId) {
      throw new WsException('Only the attacker can deploy troops. You are spectating this battle.');
    }

    // Double-check user ID matches
    if (session.attackerId !== user?.userId) {
      throw new WsException('Only the attacker can deploy troops');
    }

    // Validate troop type
    if (!Object.values(TroopType).includes(troopType as TroopType)) {
      throw new WsException('Invalid troop type');
    }
    const troopConfig = TROOP_CONFIGS[troopType as TroopType];

    // Deploy troop
    const troop = this.battleSessionManager.deployTroop(battleId, troopType, position, {
      health: troopConfig.health,
      damage: troopConfig.damage,
      speed: troopConfig.moveSpeed,
      range: troopConfig.range,
      targetType: 'ground', // For now, all troops target ground
    });

    if (!troop) {
      throw new WsException('Failed to deploy troop (max troops reached?)');
    }

    // Broadcast troop spawn event to all clients in battle
    this.broadcastBattleEvent(battleId, {
      type: 'TROOP_SPAWN',
      timestamp: Date.now(),
      data: {
        troopId: troop.id,
        troopType: troop.type,
        position: troop.position,
        health: troop.health,
      },
    });

    return {
      success: true,
      troop: {
        id: troop.id,
        type: troop.type,
        position: troop.position,
      },
    };
  }

  /**
   * Register for attack notifications
   */
  @SubscribeMessage('registerForNotifications')
  @UseGuards(WsJwtGuard)
  async handleRegisterNotifications(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    const userId = user?.userId;

    if (!userId) {
      throw new WsException('User not authenticated');
    }

    console.log(`Registering user ${userId} for attack notifications on socket ${client.id}`);

    // Track this connection for the user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(client.id);
    (client as any).userId = userId;

    return { success: true, message: 'Registered for notifications' };
  }

  /**
   * Notify a defender that their village is under attack
   * Called by the battle service when a battle starts
   */
  notifyDefenderUnderAttack(defenderId: string, battleData: {
    battleId: string;
    attackerVillageId: string;
    attackerVillageName: string;
    defenderVillageId: string;
  }) {
    const connections = this.userConnections.get(defenderId);

    if (!connections || connections.size === 0) {
      console.log(`Defender ${defenderId} not online for attack notification`);
      return;
    }

    console.log(`Notifying defender ${defenderId} of attack (${connections.size} connections)`);

    // Send notification to all defender's connected clients
    connections.forEach(socketId => {
      this.server.to(socketId).emit('attackNotification', {
        type: 'UNDER_ATTACK',
        message: `Your village is under attack by ${battleData.attackerVillageName}!`,
        battleId: battleData.battleId,
        attackerVillageId: battleData.attackerVillageId,
        attackerVillageName: battleData.attackerVillageName,
        defenderVillageId: battleData.defenderVillageId,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Broadcast a battle event to all clients in a battle room
   */
  broadcastBattleEvent(battleId: string, event: BattleEvent) {
    const roomSize = this.battleRooms.get(battleId)?.size || 0;
    console.log(`Broadcasting ${event.type} to battle ${battleId} (${roomSize} clients in room)`);
    this.server.to(battleId).emit('battleEvent', event);
  }

  /**
   * Broadcast battle end event
   */
  broadcastBattleEnd(battleId: string, result: any) {
    this.server.to(battleId).emit('battleEnd', result);
  }

  /**
   * Get connected clients in a battle
   */
  getBattleClients(battleId: string): string[] {
    const room = this.battleRooms.get(battleId);
    return room ? Array.from(room) : [];
  }
}
