'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Building } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { BuildingType, getBuildingConfig } from '@/lib/config/buildingsData';

interface VillageCanvasPlacementProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
  placementMode?: {
    active: boolean;
    buildingType: BuildingType;
    onPlace: (x: number, y: number) => void;
    onCancel: () => void;
  };
}

const GRID_SIZE = 40; // 40x40 grid
const TILE_SIZE = 15; // pixels per tile
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE; // 600px

export function VillageCanvasPlacement({
  buildings,
  onBuildingClick,
  placementMode,
}: VillageCanvasPlacementProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [isValidPlacement, setIsValidPlacement] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Pixi application
    const app = new PIXI.Application({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 0x87ceeb,
      antialias: true,
    });

    appRef.current = app;
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // Draw grid
    const gridGraphics = drawGrid();
    app.stage.addChild(gridGraphics);

    // Draw buildings
    buildings.forEach((building) => {
      const buildingContainer = drawBuilding(building, onBuildingClick);
      app.stage.addChild(buildingContainer);
    });

    // Handle placement mode
    if (placementMode?.active) {
      const canvas = app.view as HTMLCanvasElement;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;

        // Convert to grid coordinates
        const gridX = Math.floor(pixelX / TILE_SIZE);
        const gridY = Math.floor(pixelY / TILE_SIZE);

        setPreviewPosition({ x: gridX, y: gridY });

        // Check if placement is valid
        const config = getBuildingConfig(placementMode.buildingType);
        const valid = checkPlacementValid(gridX, gridY, config.size.width, config.size.height, buildings);
        setIsValidPlacement(valid);
      };

      const handleClick = () => {
        if (previewPosition && isValidPlacement) {
          placementMode.onPlace(previewPosition.x, previewPosition.y);
          setPreviewPosition(null);
        }
      };

      const handleRightClick = (e: MouseEvent) => {
        e.preventDefault();
        placementMode.onCancel();
        setPreviewPosition(null);
      };

      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('contextmenu', handleRightClick);

      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('contextmenu', handleRightClick);
        app.destroy(true, { children: true });
      };
    }

    // Cleanup
    return () => {
      app.destroy(true, { children: true });
    };
  }, [buildings, onBuildingClick, placementMode, previewPosition, isValidPlacement]);

  // Draw placement preview
  useEffect(() => {
    if (!appRef.current || !placementMode?.active || !previewPosition) return;

    const app = appRef.current;

    // Remove old preview
    const oldPreview = app.stage.children.find((child: any) => child.name === 'preview');
    if (oldPreview) {
      app.stage.removeChild(oldPreview);
    }

    // Draw new preview
    const config = getBuildingConfig(placementMode.buildingType);
    const preview = new PIXI.Graphics();
    preview.name = 'preview';

    const color = isValidPlacement ? 0x00ff00 : 0xff0000;
    const alpha = 0.4;

    preview.beginFill(color, alpha);
    preview.lineStyle(2, color, 0.8);
    preview.drawRect(
      previewPosition.x * TILE_SIZE,
      previewPosition.y * TILE_SIZE,
      config.size.width * TILE_SIZE,
      config.size.height * TILE_SIZE,
    );
    preview.endFill();

    app.stage.addChild(preview);
  }, [previewPosition, isValidPlacement, placementMode]);

  return (
    <div className="flex items-center justify-center rounded-lg border-4 border-amber-600 bg-green-800 p-4 shadow-2xl">
      <div ref={canvasRef} className="rounded-md shadow-lg" style={{ cursor: placementMode?.active ? 'crosshair' : 'default' }} />
      {placementMode?.active && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-white">
          <p className="text-sm">
            {isValidPlacement
              ? 'Click to place building'
              : 'Invalid placement'}{' '}
            • Right-click to cancel
          </p>
        </div>
      )}
    </div>
  );
}

function drawGrid(): PIXI.Graphics {
  const graphics = new PIXI.Graphics();

  // Draw grass background
  graphics.beginFill(0x228b22);
  graphics.drawRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  graphics.endFill();

  // Draw grid lines
  graphics.lineStyle(1, 0x006400, 0.2);

  for (let x = 0; x <= GRID_SIZE; x++) {
    graphics.moveTo(x * TILE_SIZE, 0);
    graphics.lineTo(x * TILE_SIZE, CANVAS_SIZE);
  }

  for (let y = 0; y <= GRID_SIZE; y++) {
    graphics.moveTo(0, y * TILE_SIZE);
    graphics.lineTo(CANVAS_SIZE, y * TILE_SIZE);
  }

  return graphics;
}

function drawBuilding(
  building: Building,
  onBuildingClick?: (building: Building) => void,
): PIXI.Container {
  const visualConfig = getBuildingVisual(building.type);
  const color = parseInt(visualConfig.color.replace('#', ''), 16);

  const width = visualConfig.size.width * TILE_SIZE;
  const height = visualConfig.size.height * TILE_SIZE;
  const x = building.positionX * TILE_SIZE;
  const y = building.positionY * TILE_SIZE;

  const container = new PIXI.Container();
  container.x = x;
  container.y = y;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Shadow
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.2);
  shadow.drawRect(2, 2, width, height);
  shadow.endFill();
  container.addChild(shadow);

  // Building rectangle
  const buildingRect = new PIXI.Graphics();
  buildingRect.beginFill(color);
  buildingRect.lineStyle(2, 0x000000, 0.5);
  buildingRect.drawRoundedRect(0, 0, width, height, 4);
  buildingRect.endFill();
  container.addChild(buildingRect);

  // Health bar
  const healthBarBg = new PIXI.Graphics();
  healthBarBg.beginFill(0x000000, 0.5);
  healthBarBg.drawRect(2, height - 6, width - 4, 4);
  healthBarBg.endFill();
  container.addChild(healthBarBg);

  const healthPercentage = building.health / building.maxHealth;
  const healthBarColor = healthPercentage > 0.5 ? 0x00ff00 : healthPercentage > 0.25 ? 0xffff00 : 0xff0000;
  const healthBar = new PIXI.Graphics();
  healthBar.beginFill(healthBarColor);
  healthBar.drawRect(2, height - 6, (width - 4) * healthPercentage, 4);
  healthBar.endFill();
  container.addChild(healthBar);

  // Building name
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

  return container;
}

function checkPlacementValid(
  x: number,
  y: number,
  width: number,
  height: number,
  buildings: Building[],
): boolean {
  // Check grid bounds
  if (x < 0 || y < 0 || x + width > GRID_SIZE || y + height > GRID_SIZE) {
    return false;
  }

  // Check collision with existing buildings
  for (const building of buildings) {
    const buildingConfig = getBuildingVisual(building.type);

    const newLeft = x;
    const newRight = x + width;
    const newTop = y;
    const newBottom = y + height;

    const existingLeft = building.positionX;
    const existingRight = building.positionX + buildingConfig.size.width;
    const existingTop = building.positionY;
    const existingBottom = building.positionY + buildingConfig.size.height;

    // Check rectangle overlap
    if (
      newLeft < existingRight &&
      newRight > existingLeft &&
      newTop < existingBottom &&
      newBottom > existingTop
    ) {
      return false;
    }
  }

  return true;
}
