'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Building } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';

interface VillageCanvasProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
}

const GRID_SIZE = 40; // 40x40 grid
const TILE_SIZE = 15; // pixels per tile
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE; // 600px

export function VillageCanvas({ buildings, onBuildingClick }: VillageCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Pixi application
    const app = new PIXI.Application({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 0x87ceeb, // Sky blue background
      antialias: true,
    });

    appRef.current = app;
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // Draw grid
    drawGrid(app);

    // Draw buildings
    buildings.forEach((building) => {
      drawBuilding(app, building, onBuildingClick);
    });

    // Cleanup
    return () => {
      app.destroy(true, { children: true });
    };
  }, [buildings, onBuildingClick]);

  return (
    <div className="flex items-center justify-center rounded-lg border-4 border-amber-600 bg-green-800 p-4 shadow-2xl">
      <div ref={canvasRef} className="rounded-md shadow-lg" />
    </div>
  );
}

function drawGrid(app: PIXI.Application) {
  const graphics = new PIXI.Graphics();

  // Draw grass background
  graphics.beginFill(0x228b22); // Forest green
  graphics.drawRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  graphics.endFill();

  // Draw grid lines
  graphics.lineStyle(1, 0x006400, 0.2); // Dark green, semi-transparent

  // Vertical lines
  for (let x = 0; x <= GRID_SIZE; x++) {
    graphics.moveTo(x * TILE_SIZE, 0);
    graphics.lineTo(x * TILE_SIZE, CANVAS_SIZE);
  }

  // Horizontal lines
  for (let y = 0; y <= GRID_SIZE; y++) {
    graphics.moveTo(0, y * TILE_SIZE);
    graphics.lineTo(CANVAS_SIZE, y * TILE_SIZE);
  }

  app.stage.addChild(graphics);
}

function drawBuilding(
  app: PIXI.Application,
  building: Building,
  onBuildingClick?: (building: Building) => void,
) {
  const visualConfig = getBuildingVisual(building.type);
  const color = parseInt(visualConfig.color.replace('#', ''), 16);

  const width = visualConfig.size.width * TILE_SIZE;
  const height = visualConfig.size.height * TILE_SIZE;
  const x = building.positionX * TILE_SIZE;
  const y = building.positionY * TILE_SIZE;

  // Create container for building
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Building base (3D effect)
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.2);
  shadow.drawRect(2, 2, width, height);
  shadow.endFill();
  container.addChild(shadow);

  // Main building rectangle
  const buildingRect = new PIXI.Graphics();
  buildingRect.beginFill(color);
  buildingRect.lineStyle(2, 0x000000, 0.5);
  buildingRect.drawRoundedRect(0, 0, width, height, 4);
  buildingRect.endFill();
  container.addChild(buildingRect);

  // Health bar background
  const healthBarBg = new PIXI.Graphics();
  healthBarBg.beginFill(0x000000, 0.5);
  healthBarBg.drawRect(2, height - 6, width - 4, 4);
  healthBarBg.endFill();
  container.addChild(healthBarBg);

  // Health bar
  const healthPercentage = building.health / building.maxHealth;
  const healthBarColor = healthPercentage > 0.5 ? 0x00ff00 : healthPercentage > 0.25 ? 0xffff00 : 0xff0000;
  const healthBar = new PIXI.Graphics();
  healthBar.beginFill(healthBarColor);
  healthBar.drawRect(2, height - 6, (width - 4) * healthPercentage, 4);
  healthBar.endFill();
  container.addChild(healthBar);

  // Building name text
  const text = new PIXI.Text(visualConfig.name, {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 2,
    align: 'center',
  });
  text.anchor.set(0.5, 0);
  text.x = width / 2;
  text.y = -15;
  container.addChild(text);

  // Interaction
  if (onBuildingClick) {
    container.on('pointerdown', () => {
      onBuildingClick(building);
    });
    container.on('pointerover', () => {
      buildingRect.tint = 0xcccccc;
    });
    container.on('pointerout', () => {
      buildingRect.tint = 0xffffff;
    });
  }

  app.stage.addChild(container);
}
