'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Building } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { BuildingType, getBuildingConfig } from '@/lib/config/buildingsData';

interface VillageCanvasPlacementProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
  onBuildingMove?: (buildingId: string, x: number, y: number) => Promise<void>;
  placementMode?: {
    active: boolean;
    buildingType: BuildingType;
    onPlace: (x: number, y: number) => void;
    onCancel: () => void;
  };
}

const GRID_SIZE = 40;
const TILE_SIZE = 15;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

export function VillageCanvasPlacement({
  buildings,
  onBuildingClick,
  onBuildingMove,
  placementMode,
}: VillageCanvasPlacementProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const buildingContainersRef = useRef<Map<string, PIXI.Container>>(new Map());
  const previewRef = useRef<PIXI.Graphics | null>(null);
  const draggedBuildingRef = useRef<{ building: Building; startX: number; startY: number } | null>(null);
  const selectedBuildingRef = useRef<Building | null>(null);

  // Initialize Pixi app ONCE
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const app = new PIXI.Application({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 0x87ceeb,
      antialias: true,
    });

    appRef.current = app;
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // Draw grid
    const gridGraphics = new PIXI.Graphics();
    gridGraphics.beginFill(0x228b22);
    gridGraphics.drawRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    gridGraphics.endFill();
    gridGraphics.lineStyle(1, 0x006400, 0.2);
    for (let x = 0; x <= GRID_SIZE; x++) {
      gridGraphics.moveTo(x * TILE_SIZE, 0);
      gridGraphics.lineTo(x * TILE_SIZE, CANVAS_SIZE);
    }
    for (let y = 0; y <= GRID_SIZE; y++) {
      gridGraphics.moveTo(0, y * TILE_SIZE);
      gridGraphics.lineTo(CANVAS_SIZE, y * TILE_SIZE);
    }
    app.stage.addChild(gridGraphics);

    // Cleanup
    return () => {
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  // Draw/update buildings when they change
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    // Remove old building containers
    buildingContainersRef.current.forEach((container, id) => {
      if (!buildings.find((b) => b.id === id)) {
        if (container && container.parent) {
          app.stage.removeChild(container);
        }
        buildingContainersRef.current.delete(id);
      }
    });

    // Add or update buildings
    buildings.forEach((building) => {
      let container = buildingContainersRef.current.get(building.id);

      if (!container) {
        // Create new building
        container = createBuildingContainer(
          building,
          onBuildingClick,
          onBuildingMove,
          draggedBuildingRef,
          selectedBuildingRef,
          () => buildings,
        );
        buildingContainersRef.current.set(building.id, container);
        app.stage.addChild(container);
      } else {
        // Update existing building position if changed
        // Check if container is still valid (not destroyed)
        if (!container.transform) {
          // Container was destroyed, remove from map and recreate
          buildingContainersRef.current.delete(building.id);
          container = createBuildingContainer(
            building,
            onBuildingClick,
            onBuildingMove,
            draggedBuildingRef,
            selectedBuildingRef,
            () => buildings,
          );
          buildingContainersRef.current.set(building.id, container);
          app.stage.addChild(container);
        } else {
          const visualConfig = getBuildingVisual(building.type);
          const newX = building.positionX * TILE_SIZE;
          const newY = building.positionY * TILE_SIZE;

          if (container.x !== newX || container.y !== newY) {
            container.x = newX;
            container.y = newY;
          }
        }
      }
    });
  }, [buildings, onBuildingClick, onBuildingMove]);

  // Handle placement mode
  useEffect(() => {
    const app = appRef.current;
    if (!app || !placementMode?.active) {
      // Remove preview if it exists
      if (previewRef.current) {
        app?.stage.removeChild(previewRef.current);
        previewRef.current = null;
      }
      return;
    }

    const canvas = app.view as HTMLCanvasElement;
    const preview = new PIXI.Graphics();
    preview.name = 'preview';
    previewRef.current = preview;
    app.stage.addChild(preview);

    const config = getBuildingConfig(placementMode.buildingType);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const gridX = Math.floor(pixelX / TILE_SIZE);
      const gridY = Math.floor(pixelY / TILE_SIZE);

      const valid = checkPlacementValid(gridX, gridY, config.size.width, config.size.height, buildings, null);

      preview.clear();
      const color = valid ? 0x00ff00 : 0xff0000;
      preview.beginFill(color, 0.4);
      preview.lineStyle(2, color, 0.8);
      preview.drawRect(gridX * TILE_SIZE, gridY * TILE_SIZE, config.size.width * TILE_SIZE, config.size.height * TILE_SIZE);
      preview.endFill();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const gridX = Math.floor(pixelX / TILE_SIZE);
      const gridY = Math.floor(pixelY / TILE_SIZE);

      const valid = checkPlacementValid(gridX, gridY, config.size.width, config.size.height, buildings, null);
      if (valid) {
        placementMode.onPlace(gridX, gridY);
      }
    };

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      placementMode.onCancel();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        placementMode.onCancel();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleRightClick);
      window.removeEventListener('keydown', handleKeyDown);
      if (previewRef.current) {
        app.stage.removeChild(previewRef.current);
        previewRef.current = null;
      }
    };
  }, [placementMode, buildings]);

  return (
    <div className="relative flex items-center justify-center rounded-lg border-4 border-amber-600 bg-green-800 p-4 shadow-2xl">
      <div
        ref={canvasRef}
        className="rounded-md shadow-lg"
        style={{ cursor: placementMode?.active ? 'crosshair' : 'default' }}
      />
      {placementMode?.active && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-white">
          <p className="text-sm">Click to place • Right-click or ESC to cancel</p>
        </div>
      )}
    </div>
  );
}

function createBuildingContainer(
  building: Building,
  onBuildingClick?: (building: Building) => void,
  onBuildingMove?: (buildingId: string, x: number, y: number) => Promise<void>,
  draggedBuildingRef?: React.MutableRefObject<{ building: Building; startX: number; startY: number } | null>,
  selectedBuildingRef?: React.MutableRefObject<Building | null>,
  getBuildings?: () => Building[],
): PIXI.Container {
  const visualConfig = getBuildingVisual(building.type);
  const color = parseInt(visualConfig.color.replace('#', ''), 16);
  const width = visualConfig.size.width * TILE_SIZE;
  const height = visualConfig.size.height * TILE_SIZE;

  const container = new PIXI.Container();
  container.x = building.positionX * TILE_SIZE;
  container.y = building.positionY * TILE_SIZE;
  container.eventMode = 'static';
  container.cursor = 'grab';

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

  // Label (only shown on hover/selection)
  const label = new PIXI.Text(visualConfig.name, {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 2,
    align: 'center',
  });
  label.anchor.set(0.5, 0);
  label.x = width / 2;
  label.y = -15;
  label.visible = false; // Hidden by default
  container.addChild(label);

  // Drag state
  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let originalPos = { x: container.x, y: container.y };
  let dragPreview: PIXI.Graphics | null = null;

  // Interaction handlers
  container.on('pointerover', () => {
    buildingRect.tint = 0xcccccc;
    label.visible = true; // Show label on hover
  });

  container.on('pointerout', () => {
    if (!isDragging) {
      buildingRect.tint = 0xffffff;
      label.visible = selectedBuildingRef?.current?.id === building.id; // Hide unless selected
    }
  });

  container.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
    if (onBuildingClick) {
      onBuildingClick(building);
      if (selectedBuildingRef) {
        selectedBuildingRef.current = building;
      }
      label.visible = true; // Keep label visible when selected
    }

    // Start drag
    isDragging = true;
    container.cursor = 'grabbing';
    dragStartPos = { x: event.globalX, y: event.globalY };
    originalPos = { x: container.x, y: container.y };

    if (draggedBuildingRef) {
      draggedBuildingRef.current = {
        building,
        startX: building.positionX,
        startY: building.positionY,
      };
    }

    // Create drag preview
    if (container.parent) {
      dragPreview = new PIXI.Graphics();
      dragPreview.name = 'dragPreview';
      container.parent.addChild(dragPreview);
    }

    event.stopPropagation();
  });

  container.on('globalpointermove', (event: PIXI.FederatedPointerEvent) => {
    if (!isDragging || !dragPreview) return;

    const dx = event.globalX - dragStartPos.x;
    const dy = event.globalY - dragStartPos.y;

    container.x = originalPos.x + dx;
    container.y = originalPos.y + dy;

    // Calculate grid position
    const gridX = Math.round(container.x / TILE_SIZE);
    const gridY = Math.round(container.y / TILE_SIZE);

    // Check if valid placement
    const buildingConfig = getBuildingVisual(building.type);
    const allBuildings = getBuildings ? getBuildings() : [];
    const valid = checkPlacementValid(
      gridX,
      gridY,
      buildingConfig.size.width,
      buildingConfig.size.height,
      allBuildings,
      building.id,
    );

    // Draw preview
    dragPreview.clear();
    const previewColor = valid ? 0x00ff00 : 0xff0000;
    dragPreview.beginFill(previewColor, 0.3);
    dragPreview.lineStyle(2, previewColor, 0.8);
    dragPreview.drawRect(gridX * TILE_SIZE, gridY * TILE_SIZE, width, height);
    dragPreview.endFill();
  });

  container.on('pointerup', async (event: PIXI.FederatedPointerEvent) => {
    if (!isDragging) return;

    isDragging = false;
    container.cursor = 'grab';

    // Calculate final grid position
    const gridX = Math.round(container.x / TILE_SIZE);
    const gridY = Math.round(container.y / TILE_SIZE);

    const buildingConfig = getBuildingVisual(building.type);
    const allBuildings = getBuildings ? getBuildings() : [];
    const valid = checkPlacementValid(
      gridX,
      gridY,
      buildingConfig.size.width,
      buildingConfig.size.height,
      allBuildings,
      building.id,
    );

    if (valid && onBuildingMove && (gridX !== building.positionX || gridY !== building.positionY)) {
      // Valid placement - call API to move
      try {
        await onBuildingMove(building.id, gridX, gridY);
        // Position will be updated when buildings prop changes
      } catch (error) {
        // Revert to original position on error
        container.x = originalPos.x;
        container.y = originalPos.y;
        alert('Failed to move building');
      }
    } else {
      // Invalid or no change - revert to original position
      container.x = originalPos.x;
      container.y = originalPos.y;
    }

    // Remove preview
    if (dragPreview && container.parent) {
      container.parent.removeChild(dragPreview);
      dragPreview = null;
    }

    if (draggedBuildingRef) {
      draggedBuildingRef.current = null;
    }
  });

  container.on('pointerupoutside', () => {
    if (!isDragging) return;

    isDragging = false;
    container.cursor = 'grab';

    // Revert to original position
    container.x = originalPos.x;
    container.y = originalPos.y;

    // Remove preview
    if (dragPreview && container.parent) {
      container.parent.removeChild(dragPreview);
      dragPreview = null;
    }

    if (draggedBuildingRef) {
      draggedBuildingRef.current = null;
    }
  });

  return container;
}

function checkPlacementValid(
  x: number,
  y: number,
  width: number,
  height: number,
  buildings: Building[],
  excludeBuildingId: string | null,
): boolean {
  if (x < 0 || y < 0 || x + width > GRID_SIZE || y + height > GRID_SIZE) {
    return false;
  }

  for (const building of buildings) {
    if (building.id === excludeBuildingId) continue;

    const buildingConfig = getBuildingVisual(building.type);
    const newLeft = x;
    const newRight = x + width;
    const newTop = y;
    const newBottom = y + height;

    const existingLeft = building.positionX;
    const existingRight = building.positionX + buildingConfig.size.width;
    const existingTop = building.positionY;
    const existingBottom = building.positionY + buildingConfig.size.height;

    if (newLeft < existingRight && newRight > existingLeft && newTop < existingBottom && newBottom > existingTop) {
      return false;
    }
  }

  return true;
}
