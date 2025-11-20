import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export interface BattleEvent {
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED' | 'BATTLE_END';
  timestamp: number;
  data: any;
}

/**
 * Connect to battle WebSocket
 */
export function connectBattleSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(`${BACKEND_URL}/battles`, {
    auth: {
      token: `Bearer ${token}`,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to battle WebSocket:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from battle WebSocket');
  });

  socket.on('connect_error', (error) => {
    console.error('Battle WebSocket connection error:', error);
  });

  return socket;
}

/**
 * Disconnect from battle WebSocket
 */
export function disconnectBattleSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a battle room
 */
export function joinBattle(battleId: string, villageId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('joinBattle', { battleId, villageId }, (response: any) => {
      if (response.success) {
        console.log('Joined battle room:', battleId);
        resolve(response);
      } else {
        console.error('Failed to join battle:', response);
        reject(new Error(response.message || 'Failed to join battle'));
      }
    });
  });
}

/**
 * Leave a battle room
 */
export function leaveBattle(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('leaveBattle', {}, (response: any) => {
      if (response.success) {
        console.log('Left battle room');
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to leave battle'));
      }
    });
  });
}

/**
 * Deploy a troop
 */
export function deployTroop(
  battleId: string,
  troopType: string,
  position: { x: number; y: number }
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('deployTroop', { battleId, troopType, position }, (response: any) => {
      if (response.success) {
        console.log('Troop deployed:', response.troop);
        resolve(response);
      } else {
        console.error('Failed to deploy troop:', response);
        reject(new Error(response.message || 'Failed to deploy troop'));
      }
    });
  });
}

/**
 * Listen to battle events
 */
export function onBattleEvent(callback: (event: BattleEvent) => void) {
  if (!socket) return;

  socket.on('battleEvent', callback);
}

/**
 * Listen to battle end event
 */
export function onBattleEnd(callback: (result: any) => void) {
  if (!socket) return;

  socket.on('battleEnd', callback);
}

/**
 * Remove event listeners
 */
export function offBattleEvent(callback: (event: BattleEvent) => void) {
  if (!socket) return;
  socket.off('battleEvent', callback);
}

export function offBattleEnd(callback: (result: any) => void) {
  if (!socket) return;
  socket.off('battleEnd', callback);
}

export { socket };
