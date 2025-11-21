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

// ============================================
// SPECTATE SOCKET (Public, no auth required)
// ============================================

let spectateSocket: Socket | null = null;

/**
 * Connect to spectate WebSocket (public, no authentication required)
 */
export function connectSpectateSocket(): Socket {
  if (spectateSocket?.connected) {
    return spectateSocket;
  }

  spectateSocket = io(`${BACKEND_URL}/spectate`, {
    transports: ['websocket', 'polling'],
    // No auth required for spectators
  });

  spectateSocket.on('connect', () => {
    console.log('[Spectate] Connected to spectate WebSocket:', spectateSocket?.id);
  });

  spectateSocket.on('disconnect', () => {
    console.log('[Spectate] Disconnected from spectate WebSocket');
  });

  spectateSocket.on('connect_error', (error) => {
    console.error('[Spectate] Connection error:', error);
  });

  return spectateSocket;
}

/**
 * Disconnect from spectate WebSocket
 */
export function disconnectSpectateSocket() {
  if (spectateSocket) {
    spectateSocket.disconnect();
    spectateSocket = null;
  }
}

/**
 * Join a battle as a spectator (no auth required)
 */
export function joinBattleAsSpectator(battleId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!spectateSocket) {
      reject(new Error('Spectate socket not connected'));
      return;
    }

    spectateSocket.emit('joinBattle', { battleId }, (response: any) => {
      if (response.success) {
        console.log('[Spectate] Joined battle as spectator:', battleId);
        resolve(response);
      } else {
        console.error('[Spectate] Failed to join battle:', response);
        reject(new Error(response.message || 'Failed to join battle'));
      }
    });
  });
}

/**
 * Leave a battle room
 */
export function leaveSpectatorBattle(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!spectateSocket) {
      reject(new Error('Spectate socket not connected'));
      return;
    }

    spectateSocket.emit('leaveBattle', {}, (response: any) => {
      if (response.success) {
        console.log('[Spectate] Left battle room');
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to leave battle'));
      }
    });
  });
}

/**
 * Listen to battle events on spectate socket
 */
export function onSpectateEvent(callback: (event: BattleEvent) => void) {
  if (!spectateSocket) return;
  spectateSocket.on('battleEvent', callback);
}

/**
 * Listen to battle end event on spectate socket
 */
export function onSpectateEnd(callback: (result: any) => void) {
  if (!spectateSocket) return;
  spectateSocket.on('battleEnd', callback);
}

/**
 * Remove spectate event listeners
 */
export function offSpectateEvent(callback: (event: BattleEvent) => void) {
  if (!spectateSocket) return;
  spectateSocket.off('battleEvent', callback);
}

export function offSpectateEnd(callback: (result: any) => void) {
  if (!spectateSocket) return;
  spectateSocket.off('battleEnd', callback);
}

export { socket, spectateSocket };
