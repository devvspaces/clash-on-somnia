'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { battlesApi, PublicBattle } from '@/lib/api/battles';
import { useAuthStore } from '@/lib/stores';
import {
  connectSpectateSocket,
  disconnectSpectateSocket,
  joinBattleAsSpectator,
  leaveSpectatorBattle,
  onSpectateEvent,
  onSpectateEnd,
  offSpectateEvent,
  offSpectateEnd,
  BattleEvent,
} from '@/lib/socket';
import { ArrowLeft, Eye, Users, Clock, Home } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BUILDING_CONFIGS, BuildingType } from '@/lib/config/buildingsData';

// Troop rendering data
interface TroopSprite {
  id: string;
  type: string;
  sprite: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  healthBar?: Graphics;
}

// Building rendering data
interface BuildingSprite {
  id: string;
  type: string;
  sprite: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  healthBar?: Graphics;
  width: number; // Store width for health bar rendering
}

// Grid and rendering constants
const GRID_SIZE = 40;
const TILE_SIZE = 16;
const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE;

export default function SpectateBattlePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = params.id as string;
  const returnTo = searchParams.get('returnTo') || '/';
  const { isAuthenticated } = useAuthStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const troopsLayerRef = useRef<Container | null>(null);
  const effectsLayerRef = useRef<Container | null>(null);

  const [battle, setBattle] = useState<PublicBattle | null>(null);
  const [battleStatus, setBattleStatus] = useState<string>('Loading battle...');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [destructionPercentage, setDestructionPercentage] = useState(0);
  const [stars, setStars] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Store sprites
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const troopSpritesRef = useRef<Map<string, TroopSprite>>(new Map());

  // Load battle data
  useEffect(() => {
    if (!battleId) return;

    const loadBattle = async () => {
      try {
        const data = await battlesApi.getRecentBattles(100);
        const battleData = data.battles.find((b) => b.id === battleId);

        if (!battleData) {
          setBattleStatus('Battle not found');
          return;
        }

        setBattle(battleData);
        setDestructionPercentage(battleData.destructionPercentage || 0);
        setStars(battleData.stars || 0);

        if (battleData.status === 'completed') {
          setBattleStatus(`Battle ended ${formatDistanceToNow(new Date(battleData.createdAt), { addSuffix: true })}`);
        } else {
          setBattleStatus('Connecting to live battle...');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load battle:', error);
        setBattleStatus('Failed to load battle');
        setIsLoading(false);
      }
    };

    loadBattle();
  }, [battleId]);

  // Initialize Pixi.js canvas
  useEffect(() => {
    if (!canvasRef.current || appRef.current || !battle) return;

    const app = new Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x2d5016,
      antialias: true,
    });

    canvasRef.current?.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const buildingsLayer = new Container();
    const troopsLayer = new Container();
    const effectsLayer = new Container();

    app.stage.addChild(buildingsLayer);
    app.stage.addChild(troopsLayer);
    app.stage.addChild(effectsLayer);

    buildingsLayerRef.current = buildingsLayer;
    troopsLayerRef.current = troopsLayer;
    effectsLayerRef.current = effectsLayer;

    // Draw grid
    drawGrid(app.stage);

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [battle]);

  // Draw grid
  const drawGrid = (stage: Container) => {
    const grid = new Graphics();
    grid.lineStyle(1, 0x444444, 0.3);

    for (let x = 0; x <= GRID_SIZE; x++) {
      grid.moveTo(x * TILE_SIZE, 0);
      grid.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      grid.moveTo(0, y * TILE_SIZE);
      grid.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
    }

    stage.addChild(grid);
  };

  // Get building color
  const getBuildingColor = (type: string): number => {
    switch (type.toUpperCase()) {
      case 'TOWN_HALL':
        return 0xff6b6b;
      case 'GOLD_MINE':
        return 0xffd700;
      case 'ELIXIR_COLLECTOR':
        return 0x9b59b6;
      case 'ARMY_CAMP':
        return 0x3498db;
      case 'CANNON':
        return 0x95a5a6;
      case 'ARCHER_TOWER':
        return 0x34495e;
      case 'WALL':
        return 0x7f8c8d;
      default:
        return 0xbdc3c7;
    }
  };

  // Get troop color
  const getTroopColor = (type: string): number => {
    switch (type) {
      case 'BARBARIAN':
        return 0xff6b6b;
      case 'ARCHER':
        return 0x9b59b6;
      case 'GIANT':
        return 0x3498db;
      default:
        return 0x95a5a6;
    }
  };

  // Create health bar
  const createHealthBar = (health: number, maxHealth: number, width: number): Graphics => {
    const healthBar = new Graphics();
    const barHeight = 3;
    const healthPercent = health / maxHealth;

    healthBar.beginFill(0x000000, 0.5);
    healthBar.drawRect(0, 0, width, barHeight);
    healthBar.endFill();

    healthBar.beginFill(healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c);
    healthBar.drawRect(0, 0, width * healthPercent, barHeight);
    healthBar.endFill();

    return healthBar;
  };

  // Render a building
  const renderBuilding = (building: any) => {
    if (!buildingsLayerRef.current) return;

    const buildingContainer = new Container();

    // Get building config to determine size
    const buildingType = building.type.toLowerCase() as BuildingType;
    const config = BUILDING_CONFIGS[buildingType];
    const buildingWidth = config ? config.size.width * TILE_SIZE : 2 * TILE_SIZE;
    const buildingHeight = config ? config.size.height * TILE_SIZE : 2 * TILE_SIZE;

    // Create building sprite (simple rectangle)
    const sprite = new Graphics();
    sprite.beginFill(getBuildingColor(building.type));
    sprite.drawRect(0, 0, buildingWidth, buildingHeight);
    sprite.endFill();

    // Add border
    sprite.lineStyle(1, 0x000000, 0.5);
    sprite.drawRect(0, 0, buildingWidth, buildingHeight);

    buildingContainer.addChild(sprite);

    // Add label
    const label = new Text(building.type.replace(/_/g, ' '), {
      fontSize: 8,
      fill: 0xffffff,
    });
    label.position.set(buildingWidth / 2, buildingHeight / 2);
    label.anchor.set(0.5);
    buildingContainer.addChild(label);

    // Position building
    buildingContainer.position.set(building.position.x * TILE_SIZE, building.position.y * TILE_SIZE);

    buildingsLayerRef.current.addChild(buildingContainer);

    // Create health bar
    const healthBar = createHealthBar(building.health, building.maxHealth, buildingWidth);
    healthBar.position.set(building.position.x * TILE_SIZE, (building.position.y - 0.5) * TILE_SIZE);
    buildingsLayerRef.current.addChild(healthBar);

    buildingSpritesRef.current.set(building.id, {
      id: building.id,
      type: building.type,
      sprite: buildingContainer,
      position: building.position,
      health: building.health,
      maxHealth: building.maxHealth,
      healthBar,
      width: buildingWidth,
    });
  };

  // Battle event handlers
  const handleBattleEvent = useCallback((event: BattleEvent) => {
    console.log('Spectator received event:', event.type);

    switch (event.type) {
      case 'TROOP_SPAWN':
        handleTroopSpawn(event.data);
        break;
      case 'TROOP_MOVE':
        handleTroopMove(event.data);
        break;
      case 'TROOP_ATTACK':
        handleTroopAttacked(event.data);
        break;
      case 'BUILDING_ATTACK':
        handleBuildingAttack(event.data);
        break;
      case 'BUILDING_DESTROYED':
        handleBuildingDestroyed(event.data);
        break;
      case 'TROOP_DEATH':
        handleTroopDeath(event.data);
        break;
      case 'BATTLE_END':
        handleBattleEnd(event.data);
        break;
    }
  }, []);

  const handleBattleEnd = useCallback((result: any) => {
    console.log('Battle ended:', result);
    setBattleStatus(`Battle ended! ${result.stars} stars - ${result.destructionPercentage}% destruction`);
    setDestructionPercentage(result.destructionPercentage);
    setStars(result.stars);
  }, []);

  // Handle troop spawn
  const handleTroopSpawn = (data: any) => {
    if (!troopsLayerRef.current) return;

    const troopContainer = new Container();
    const sprite = new Graphics();
    sprite.beginFill(getTroopColor(data.troopType));
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);
    sprite.endFill();
    sprite.lineStyle(1, 0x000000, 0.5);
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);

    troopContainer.addChild(sprite);

    const pixelX = data.position.x * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = data.position.y * TILE_SIZE + TILE_SIZE / 2;
    troopContainer.position.set(pixelX, pixelY);

    troopsLayerRef.current.addChild(troopContainer);

    const healthBar = createHealthBar(data.health, data.health, TILE_SIZE);
    healthBar.position.set(data.position.x * TILE_SIZE, (data.position.y - 0.3) * TILE_SIZE);
    troopsLayerRef.current.addChild(healthBar);

    troopSpritesRef.current.set(data.troopId, {
      id: data.troopId,
      type: data.troopType,
      sprite: troopContainer,
      position: data.position,
      health: data.health,
      maxHealth: data.health,
      healthBar,
    });
  };

  // Handle troop move
  const handleTroopMove = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) {
      console.warn('[Spectate] TROOP_MOVE for unknown troop:', data.troopId, 'Creating it now...');
      // Troop spawned before spectator joined - create it dynamically
      handleTroopSpawn({
        troopId: data.troopId,
        troopType: 'BARBARIAN', // Default type, we don't know the actual type
        position: data.to,
        health: 100, // Default health
      });
      return;
    }

    troopSprite.sprite.position.set(
      data.to.x * TILE_SIZE + TILE_SIZE / 2,
      data.to.y * TILE_SIZE + TILE_SIZE / 2
    );
    troopSprite.position = data.to;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.position.set(data.to.x * TILE_SIZE, (data.to.y - 0.3) * TILE_SIZE);
    }
  };

  // Handle building attack
  const handleBuildingAttack = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite || !buildingSprite.healthBar) return;

    buildingSprite.health = data.remainingHealth;

    buildingSprite.healthBar.clear();
    const barWidth = buildingSprite.width; // Use actual building width
    const barHeight = 3;
    const healthPercent = buildingSprite.health / buildingSprite.maxHealth;

    buildingSprite.healthBar.beginFill(0x000000, 0.5);
    buildingSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
    buildingSprite.healthBar.endFill();

    buildingSprite.healthBar.beginFill(
      healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c
    );
    buildingSprite.healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
    buildingSprite.healthBar.endFill();

    // Show projectile for ranged attacks (archers) or melee effect for melee troops (barbarians)
    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to, data.troopType);
    } else {
      // Melee attack - show slash effect at building
      createMeleeEffect(buildingSprite.position);
    }
  };

  // Handle troop attacked event
  const handleTroopAttacked = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.health = data.remainingHealth;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.clear();
      const barWidth = TILE_SIZE;
      const barHeight = 3;
      const healthPercent = troopSprite.health / troopSprite.maxHealth;

      troopSprite.healthBar.beginFill(0x000000, 0.5);
      troopSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
      troopSprite.healthBar.endFill();

      troopSprite.healthBar.beginFill(
        healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c
      );
      troopSprite.healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
      troopSprite.healthBar.endFill();
    }

    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to);
    }
  };

  // Handle building destroyed
  const handleBuildingDestroyed = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    buildingSprite.sprite.alpha = 0.3;
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.visible = false;
    }
  };

  // Handle troop death
  const handleTroopDeath = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.sprite.destroy();
    if (troopSprite.healthBar) {
      troopSprite.healthBar.destroy();
    }
    troopSpritesRef.current.delete(data.troopId);
  };

  // Create projectile effect for ranged attacks
  const createProjectile = (from: { x: number; y: number }, to: { x: number; y: number }, troopType?: string) => {
    if (!effectsLayerRef.current) return;

    const projectile = new Graphics();

    // Different projectiles for different troop types
    if (troopType === 'ARCHER') {
      // Arrow - thin line with arrowhead
      projectile.lineStyle(2, 0x8b4513, 1); // brown arrow
      projectile.moveTo(0, 0);
      projectile.lineTo(8, 0);
      // Arrowhead
      projectile.lineTo(6, -2);
      projectile.moveTo(8, 0);
      projectile.lineTo(6, 2);

      // Rotate arrow to face target
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      projectile.rotation = Math.atan2(dy, dx);
    } else {
      // Default projectile (yellow ball for defense buildings)
      projectile.beginFill(0xffff00);
      projectile.drawCircle(0, 0, 3);
      projectile.endFill();
    }

    projectile.position.set(from.x * TILE_SIZE + TILE_SIZE / 2, from.y * TILE_SIZE + TILE_SIZE / 2);
    effectsLayerRef.current.addChild(projectile);

    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      projectile.position.set(
        (from.x + (to.x - from.x) * progress) * TILE_SIZE + TILE_SIZE / 2,
        (from.y + (to.y - from.y) * progress) * TILE_SIZE + TILE_SIZE / 2
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        projectile.destroy();
      }
    };

    animate();
  };

  // Create melee attack effect
  const createMeleeEffect = (position: { x: number; y: number }) => {
    if (!effectsLayerRef.current) return;

    const slash = new Graphics();

    // Draw a slash effect (curved line)
    slash.lineStyle(3, 0xff0000, 0.8);
    slash.arc(0, 0, TILE_SIZE, -Math.PI / 4, Math.PI / 4);

    slash.position.set(position.x * TILE_SIZE + TILE_SIZE, position.y * TILE_SIZE + TILE_SIZE);
    effectsLayerRef.current.addChild(slash);

    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      slash.alpha = 1 - progress;
      slash.rotation = progress * Math.PI / 2; // Rotate as it fades

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        slash.destroy();
      }
    };

    animate();
  };

  // Connect to WebSocket for live battles (public spectate socket, no auth required)
  useEffect(() => {
    if (!battle || battle.status !== 'active') return;

    console.log('[Spectate] Connecting to public spectate socket for battle:', battleId);
    const socket = connectSpectateSocket();

    // Register event handlers immediately (before or after connection)
    console.log('[Spectate] Registering event handlers...');
    onSpectateEvent(handleBattleEvent);
    onSpectateEnd(handleBattleEnd);

    // Test event listener to debug
    socket.on('battleEvent', (event: any) => {
      console.log('[Spectate] RAW EVENT RECEIVED:', event);
    });

    // Function to join battle
    const joinBattleRoom = () => {
      console.log('[Spectate] Joining battle room...');
      joinBattleAsSpectator(battleId)
        .then((response) => {
          console.log('[Spectate] Successfully joined battle:', response);
          setBattleStatus('Spectating live battle - watching real-time updates');
          setIsConnected(true);

          // Render initial buildings if session data is available
          if (response.session && response.session.buildings && buildingsLayerRef.current) {
            console.log('[Spectate] Rendering initial buildings:', response.session.buildings.length);
            response.session.buildings.forEach((building: any) => {
              renderBuilding(building);
            });
          }

          // Render existing troops if any
          if (response.session && response.session.troops && troopsLayerRef.current) {
            console.log('[Spectate] Rendering existing troops:', response.session.troops.length);
            response.session.troops.forEach((troop: any) => {
              handleTroopSpawn({
                troopId: troop.id,
                troopType: troop.type,
                position: troop.position,
                health: troop.health,
              });
            });
          }
        })
        .catch((error) => {
          console.error('[Spectate] Failed to join:', error);
          setBattleStatus('Failed to join battle - it may have ended');
          setIsConnected(false);
        });
    };

    // Join immediately if already connected, otherwise wait for connect event
    if (socket.connected) {
      console.log('[Spectate] Socket already connected, joining immediately');
      joinBattleRoom();
    } else {
      console.log('[Spectate] Waiting for socket to connect...');
      socket.on('connect', () => {
        console.log('[Spectate] Connected! Socket ID:', socket.id);
        joinBattleRoom();
      });
    }

    socket.on('connect_error', (error) => {
      console.error('[Spectate] Connection error:', error);
      setIsConnected(false);
      setBattleStatus('Connection failed - battle may have ended');
    });

    socket.on('disconnect', () => {
      console.log('[Spectate] Disconnected from spectate socket');
      setIsConnected(false);
    });

    return () => {
      console.log('[Spectate] Cleaning up spectate socket connection');
      socket.off('battleEvent'); // Remove raw listener
      offSpectateEvent(handleBattleEvent);
      offSpectateEnd(handleBattleEnd);
      leaveSpectatorBattle().catch(console.error);
      disconnectSpectateSocket();
    };
  }, [battle, battleId, handleBattleEvent, handleBattleEnd]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Battle not found</h2>
          <Button onClick={() => router.push(returnTo)}>
            {returnTo === '/war-room' ? 'Back to War Room' : 'Return Home'}
          </Button>
        </div>
      </div>
    );
  }

  const isLive = battle.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push(returnTo)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {returnTo === '/war-room' ? 'Back to War Room' : 'Back to Home'}
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              {isLive ? 'Live Battle' : 'Battle Replay'}
            </h1>
            <div className="w-32" />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Battle Info */}
          <div className="space-y-4">
            {/* Battle Status */}
            <Card className={`p-4 ${isLive && isConnected ? 'bg-red-50 dark:bg-red-950 border-red-500' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {isLive && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                <h3 className="font-bold">
                  {isLive ? 'LIVE BATTLE' : 'COMPLETED BATTLE'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">{battleStatus}</p>
            </Card>

            {/* Matchup */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">Matchup</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Attacker</div>
                  <div className="font-semibold text-lg">{battle.attackerVillage.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {battle.attackerTroops.reduce((sum, t) => sum + t.count, 0)} troops
                  </div>
                </div>
                <div className="border-t border-border my-2"></div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Defender</div>
                  <div className="font-semibold text-lg">{battle.defenderVillage.name}</div>
                </div>
              </div>
            </Card>

            {/* Battle Results */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">Battle Stats</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Stars</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${star <= stars ? 'text-yellow-400' : 'text-gray-600'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Destruction</span>
                  <span className="font-bold">{destructionPercentage}%</span>
                </div>
                {!isLive && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gold Looted</span>
                      <span className="text-yellow-500">🪙 {battle.lootGold.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Elixir Looted</span>
                      <span className="text-purple-500">💜 {battle.lootElixir.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Info */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-500">
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4" />
                Spectator Mode
              </h3>
              <p className="text-sm">
                {isLive
                  ? 'You are watching this battle live. Troops and buildings will update in real-time.'
                  : 'This battle has ended. You are viewing the final state.'}
              </p>
            </Card>

            {isAuthenticated && (
              <Button variant="default" className="w-full" onClick={() => router.push('/attack')}>
                Start Your Own Battle
              </Button>
            )}
          </div>

          {/* Right Column - Battle Canvas */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex justify-center">
                <div
                  ref={canvasRef}
                  className="border-4 border-slate-700 rounded shadow-2xl"
                  style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
