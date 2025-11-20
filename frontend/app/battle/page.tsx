'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import { BattleBuilding, BattleSession, battlesApi } from '@/lib/api/battles';
import { useAuthStore } from '@/lib/stores';
import {
  connectBattleSocket,
  disconnectBattleSocket,
  joinBattle,
  leaveBattle,
  deployTroop,
  onBattleEvent,
  onBattleEnd,
  offBattleEvent,
  offBattleEnd,
  BattleEvent,
} from '@/lib/socket';
import { Sword, Shield, Target, X, Home, ArrowLeft } from 'lucide-react';

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
}

// Grid and rendering constants
const GRID_SIZE = 40;
const TILE_SIZE = 16; // Smaller tiles for better fit
const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE;

export default function BattlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const battleId = searchParams.get('battleId');
  const villageId = searchParams.get('villageId');

  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const troopsLayerRef = useRef<Container | null>(null);
  const effectsLayerRef = useRef<Container | null>(null);

  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [selectedTroopType, setSelectedTroopType] = useState<string | null>(null);
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>({});
  const [battleStarted, setBattleStarted] = useState(false);
  const [destructionPercentage, setDestructionPercentage] = useState(0);
  const [battleStatus, setBattleStatus] = useState<string>('Connecting to battle server...');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Store sprites
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const troopSpritesRef = useRef<Map<string, TroopSprite>>(new Map());

  // Parse troops from URL params
  const troops = searchParams.get('troops')
    ? JSON.parse(decodeURIComponent(searchParams.get('troops')!))
    : [];

  // Load battle session
  useEffect(() => {
    if (!battleId) {
      router.push('/village');
      return;
    }

    // Battle session should be passed via URL params
    const sessionData = searchParams.get('session');
    if (sessionData) {
      const session = JSON.parse(decodeURIComponent(sessionData));
      setBattleSession({ battleId, session });
      setIsLoading(false);
      if (troops.length > 0) {
        setSelectedTroopType(troops[0].type);
      }
    }
  }, [battleId, router, searchParams]);

  // Initialize Pixi.js canvas
  useEffect(() => {
    if (!canvasRef.current || appRef.current || !battleSession) return;

    const initPixi = () => {
      // Pixi.js v7 syntax
      const app = new Application({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x2d5016, // Grass green
        antialias: true,
      });

      canvasRef.current?.appendChild(app.view as HTMLCanvasElement);
      appRef.current = app;

      // Create layers
      const stage = new Container();
      const buildingsLayer = new Container();
      const troopsLayer = new Container();
      const effectsLayer = new Container();

      stage.addChild(buildingsLayer);
      stage.addChild(troopsLayer);
      stage.addChild(effectsLayer);

      app.stage.addChild(stage);

      stageRef.current = stage;
      buildingsLayerRef.current = buildingsLayer;
      troopsLayerRef.current = troopsLayer;
      effectsLayerRef.current = effectsLayer;

      // Draw grid
      drawGrid(app.stage);

      // Render buildings
      console.log('Rendering buildings:', battleSession.session.buildings);
      renderBuildings(battleSession.session.buildings, buildingsLayer);

      // Add click handler for troop deployment
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointerdown', handleCanvasClick);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [battleSession]);

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

  // Render buildings on canvas
  const renderBuildings = (buildings: BattleBuilding[], layer: Container) => {
    console.log('renderBuildings called with:', buildings);
    buildings.forEach((building) => {
      const buildingContainer = new Container();

      // Create building sprite (simple rectangle)
      const sprite = new Graphics();
      sprite.beginFill(getBuildingColor(building.type));
      sprite.drawRect(0, 0, 2 * TILE_SIZE, 2 * TILE_SIZE);
      sprite.endFill();

      // Add border
      sprite.lineStyle(1, 0x000000, 0.5);
      sprite.drawRect(0, 0, 2 * TILE_SIZE, 2 * TILE_SIZE);

      buildingContainer.addChild(sprite);

      // Add label
      const label = new Text(building.type.replace(/_/g, ' '), {
        fontSize: 8,
        fill: 0xffffff,
      });
      label.position.set(TILE_SIZE, TILE_SIZE);
      label.anchor.set(0.5);
      buildingContainer.addChild(label);

      // Position building
      buildingContainer.position.set(building.position.x * TILE_SIZE, building.position.y * TILE_SIZE);

      layer.addChild(buildingContainer);
      console.log(`Added building ${building.id} at (${building.position.x}, ${building.position.y})`);

      // Create health bar
      const healthBar = createHealthBar(building.health, building.maxHealth, 2 * TILE_SIZE);
      healthBar.position.set(building.position.x * TILE_SIZE, (building.position.y - 0.5) * TILE_SIZE);
      layer.addChild(healthBar);

      buildingSpritesRef.current.set(building.id, {
        id: building.id,
        type: building.type,
        sprite: buildingContainer,
        position: building.position,
        health: building.health,
        maxHealth: building.maxHealth,
        healthBar,
      });
    });
    console.log(`Rendered ${buildings.length} buildings`);
  };

  // Get building color based on type
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

  // Handle canvas click for troop deployment
  const handleCanvasClick = useCallback(
    (event: any) => {
      if (!selectedTroopType || !battleSession) return;

      const troopConfig = troops.find((t: any) => t.type === selectedTroopType);
      if (!troopConfig) return;

      const deployed = deployedCounts[selectedTroopType] || 0;
      if (deployed >= troopConfig.count) {
        setBattleStatus(`No more ${selectedTroopType} available!`);
        return;
      }

      const pos = event.data.global;
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);

      console.log('Deploying troop:', { battleId: battleSession.battleId, troopType: selectedTroopType, position: { x: gridX, y: gridY } });

      // Deploy troop via WebSocket
      deployTroop(battleSession.battleId, selectedTroopType, { x: gridX, y: gridY })
        .then((response) => {
          setDeployedCounts((prev) => ({
            ...prev,
            [selectedTroopType]: (prev[selectedTroopType] || 0) + 1,
          }));

          setBattleStarted(true);
          setBattleStatus(`Deployed ${selectedTroopType} at (${gridX}, ${gridY})`);
        })
        .catch((error) => {
          console.error('Failed to deploy troop:', error);
          setBattleStatus(`Failed to deploy ${selectedTroopType}`);
        });
    },
    [selectedTroopType, battleSession, troops, deployedCounts]
  );

  // Connect to WebSocket and join battle
  useEffect(() => {
    if (!battleSession || !villageId) return;

    // Get token from localStorage (stored as 'auth_token' by the auth store)
    const token = localStorage.getItem('auth_token');

    if (!token) {
      console.error('No authentication token found');
      setBattleStatus('Authentication error - please log in again');
      setIsConnected(false);
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    console.log('Connecting to battle WebSocket with token...');
    const socket = connectBattleSocket(token);

    // Wait for connection before joining battle
    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.error('WebSocket connection timeout');
        setBattleStatus('Connection failed - retrying...');
      }
    }, 5000);

    socket.on('connect', () => {
      console.log('WebSocket connected! Joining battle room...');
      setIsConnected(true);
      setBattleStatus('Click on the map to deploy your selected troop!');
      clearTimeout(connectionTimeout);

      // Join battle room after connection is established
      joinBattle(battleSession.battleId, villageId)
        .then(() => {
          console.log('Successfully joined battle room');
          setBattleStatus('Ready! Click on the map to deploy troops!');
        })
        .catch((error) => {
          console.error('Failed to join battle:', error);
          setBattleStatus('Failed to join battle - please refresh');
        });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      setBattleStatus('Connection error - check if backend is running');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setBattleStatus('Disconnected from battle server');
    });

    return () => {
      clearTimeout(connectionTimeout);
      leaveBattle().catch(console.error);
      disconnectBattleSocket();
    };
  }, [battleSession, villageId, router]);

  // Listen to battle events
  useEffect(() => {
    const handleBattleEvent = (event: BattleEvent) => {
      console.log('Battle event:', event);

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
        case 'TROOP_DEATH':
          handleTroopDeath(event.data);
          break;
        case 'BUILDING_ATTACK':
          handleBuildingAttack(event.data);
          break;
        case 'BUILDING_DESTROYED':
          handleBuildingDestroyed(event.data);
          break;
      }
    };

    const handleBattleEndEvent = (result: any) => {
      console.log('Battle ended:', result);
      setBattleStatus(`Battle Over! ${result.stars} Stars - ${result.destructionPercentage}% Destruction`);
      setDestructionPercentage(result.destructionPercentage);

      setTimeout(() => {
        router.push(`/village?battleResult=${encodeURIComponent(JSON.stringify(result))}`);
      }, 3000);
    };

    onBattleEvent(handleBattleEvent);
    onBattleEnd(handleBattleEndEvent);

    return () => {
      offBattleEvent(handleBattleEvent);
      offBattleEnd(handleBattleEndEvent);
    };
  }, [router]);

  // Handle troop spawn event
  const handleTroopSpawn = (data: any) => {
    if (!troopsLayerRef.current) return;

    const troopContainer = new Container();

    // Create troop sprite (circle)
    const sprite = new Graphics();
    sprite.beginFill(getTroopColor(data.troopType));
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);
    sprite.endFill();

    // Add border
    sprite.lineStyle(1, 0x000000, 0.5);
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);

    troopContainer.addChild(sprite);

    // Position troop
    troopContainer.position.set(data.position.x * TILE_SIZE + TILE_SIZE / 2, data.position.y * TILE_SIZE + TILE_SIZE / 2);

    troopsLayerRef.current.addChild(troopContainer);

    // Create health bar
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

  // Get troop color based on type
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

  // Handle troop move event
  const handleTroopMove = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.sprite.position.set(data.to.x * TILE_SIZE + TILE_SIZE / 2, data.to.y * TILE_SIZE + TILE_SIZE / 2);
    troopSprite.position = data.to;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.position.set(data.to.x * TILE_SIZE, (data.to.y - 0.3) * TILE_SIZE);
    }
  };

  // Handle building attack event
  const handleBuildingAttack = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    buildingSprite.health = data.remainingHealth;

    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.clear();
      const barWidth = 2 * TILE_SIZE;
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
    }

    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to);
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

  // Handle building destroyed event
  const handleBuildingDestroyed = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    createExplosion(data.position);
    buildingSprite.sprite.alpha = 0.3;
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.visible = false;
    }
  };

  // Handle troop death event
  const handleTroopDeath = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    createExplosion(data.position, 0.5);
    troopSprite.sprite.destroy();
    if (troopSprite.healthBar) {
      troopSprite.healthBar.destroy();
    }
    troopSpritesRef.current.delete(data.troopId);
  };

  // Create projectile effect
  const createProjectile = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (!effectsLayerRef.current) return;

    const projectile = new Graphics();
    projectile.beginFill(0xffff00);
    projectile.drawCircle(0, 0, 2);
    projectile.endFill();

    projectile.position.set(from.x * TILE_SIZE, from.y * TILE_SIZE);
    effectsLayerRef.current.addChild(projectile);

    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      projectile.position.set(
        (from.x + (to.x - from.x) * progress) * TILE_SIZE,
        (from.y + (to.y - from.y) * progress) * TILE_SIZE
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        projectile.destroy();
      }
    };

    animate();
  };

  // Create explosion effect
  const createExplosion = (position: { x: number; y: number }, scale: number = 1) => {
    if (!effectsLayerRef.current) return;

    const explosion = new Graphics();
    explosion.beginFill(0xff4500, 0.8);
    explosion.drawCircle(0, 0, TILE_SIZE * scale);
    explosion.endFill();

    explosion.position.set(position.x * TILE_SIZE, position.y * TILE_SIZE);
    effectsLayerRef.current.addChild(explosion);

    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      explosion.alpha = 1 - progress;
      explosion.scale.set(1 + progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        explosion.destroy();
      }
    };

    animate();
  };

  if (isLoading || !battleSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading battle...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 dark:from-red-950 dark:via-orange-950 dark:to-yellow-950">
      <Navbar />

      <div className="container mx-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/village')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Village
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sword className="w-6 h-6 text-red-500" />
            Battle in Progress
          </h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-4">
            {/* Connection Status */}
            <Card className={`p-4 ${isConnected ? 'bg-green-50 dark:bg-green-950 border-green-500' : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <h3 className="font-bold text-sm">
                  {isConnected ? 'Connected to Battle Server' : 'Connecting...'}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isConnected ? 'Ready to deploy troops!' : 'Please wait...'}
              </p>
            </Card>

            {/* Battle Info */}
            <Card className="p-4">
              <h3 className="font-bold text-lg mb-2">Battle Status</h3>
              <p className="text-sm mb-2">{battleStatus}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Destruction:</span>
                  <span className="font-bold text-red-600">{destructionPercentage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Battle ID:</span>
                  <span className="font-mono text-xs">{battleSession.battleId.slice(0, 8)}</span>
                </div>
              </div>
            </Card>

            {/* Troop Selection */}
            <Card className="p-4">
              <h3 className="font-bold text-lg mb-3">Deploy Troops</h3>
              <div className="space-y-2">
                {troops.map((troop: any) => {
                  const deployed = deployedCounts[troop.type] || 0;
                  const remaining = troop.count - deployed;

                  return (
                    <Button
                      key={troop.type}
                      variant={selectedTroopType === troop.type ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => setSelectedTroopType(troop.type)}
                      disabled={remaining === 0}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {troop.type}
                      </span>
                      <span className="font-mono">
                        {remaining}/{troop.count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-2 border-blue-500">
              <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Shield className="w-5 h-5" />
                How to Deploy Troops
              </h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                  <span>Select a troop type from above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                  <span><strong>Click anywhere</strong> on the green map to deploy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                  <span>Troops will automatically move and attack!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">4.</span>
                  <span>Destroy 50%+ of buildings to win!</span>
                </li>
              </ul>
              {selectedTroopType && (
                <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs font-semibold text-center">
                  🎯 {selectedTroopType} selected - Click the map!
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Battle Map (2 columns wide) */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex justify-center">
                <div
                  ref={canvasRef}
                  className={`border-4 border-slate-700 rounded shadow-2xl ${selectedTroopType && isConnected ? 'cursor-crosshair' : 'cursor-wait'}`}
                  style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                  title={selectedTroopType ? `Click to deploy ${selectedTroopType}` : 'Select a troop first'}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
