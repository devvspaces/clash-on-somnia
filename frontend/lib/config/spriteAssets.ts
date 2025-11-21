/**
 * Sprite Asset Configuration
 *
 * Maps game entities (buildings, decorations, cursors) to their sprite file paths
 * Defines sprite dimensions, anchor points, and scaling information
 */

import { BuildingType } from './buildings';

export interface SpriteConfig {
  path: string;
  /** Original sprite dimensions (for reference) */
  nativeSize?: { width: number; height: number };
  /** Anchor point (0-1, where 0.5 is center) */
  anchor?: { x: number; y: number };
  /** Additional scale multiplier beyond grid fitting */
  scaleMultiplier?: number;
  /** Y-offset for positioning (useful for tall sprites) */
  yOffset?: number;
}

export interface CursorConfig {
  path: string;
  /** CSS cursor hotspot (x, y in pixels from top-left) */
  hotspot?: { x: number; y: number };
}

/**
 * Building Sprite Mappings
 * Using Voxel tiles from /assets/Isometric Blocks/PNG/Voxel tiles/
 */
export const BUILDING_SPRITES: Record<BuildingType, SpriteConfig> = {
  [BuildingType.TOWN_HALL]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_18.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.GOLD_MINE]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_31.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.ELIXIR_COLLECTOR]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_32.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.GOLD_STORAGE]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_33.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.ELIXIR_STORAGE]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_34.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.CANNON]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_40.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.ARCHER_TOWER]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_41.png',
    anchor: { x: 0.5, y: 0.6 }, // Lower anchor for tall tower
    scaleMultiplier: 1.0,
    yOffset: -8, // Lift tower up slightly
    nativeSize: { width: 128, height: 160 },
  },
  [BuildingType.WALL]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_01.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.ARMY_CAMP]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_28.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
  [BuildingType.BARRACKS]: {
    path: '/assets/Isometric Blocks/PNG/Voxel tiles/voxelTile_29.png',
    anchor: { x: 0.5, y: 0.5 },
    scaleMultiplier: 1.0,
    nativeSize: { width: 128, height: 128 },
  },
};

/**
 * Cursor Sprite Mappings
 * Using pixel cursors from /assets/kenney_cursor-pixel-pack/
 */
export enum CursorState {
  DEFAULT = 'default',
  HOVER = 'hover',
  GRAB = 'grab',
  GRABBING = 'grabbing',
  TARGET = 'target',
  POINTER = 'pointer',
}

export const CURSOR_SPRITES: Record<CursorState, CursorConfig> = {
  [CursorState.DEFAULT]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0000.png',
    hotspot: { x: 0, y: 0 },
  },
  [CursorState.HOVER]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0046.png',
    hotspot: { x: 8, y: 8 },
  },
  [CursorState.GRAB]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0013.png',
    hotspot: { x: 8, y: 8 },
  },
  [CursorState.GRABBING]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0014.png',
    hotspot: { x: 8, y: 8 },
  },
  [CursorState.TARGET]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0047.png',
    hotspot: { x: 16, y: 16 },
  },
  [CursorState.POINTER]: {
    path: '/assets/kenney_cursor-pixel-pack/Tiles/tile_0046.png',
    hotspot: { x: 8, y: 8 },
  },
};

/**
 * Decoration Sprite Mappings
 * Using plants from /assets/isometric-plant-pack/
 */
export interface DecorationConfig extends SpriteConfig {
  category: 'tree' | 'plant' | 'rock';
  /** Size in grid tiles (1 = 1x1, 2 = 2x2) */
  gridSize: number;
}

export const DECORATIONS: Record<string, DecorationConfig> = {
  PALM_TREE: {
    path: '/assets/isometric-plant-pack/palm01.png',
    category: 'tree',
    gridSize: 1,
    anchor: { x: 0.5, y: 0.8 },
    nativeSize: { width: 128, height: 256 },
  },
  PINE_TREE: {
    path: '/assets/isometric-plant-pack/pine-full01.png',
    category: 'tree',
    gridSize: 1,
    anchor: { x: 0.5, y: 0.8 },
    nativeSize: { width: 128, height: 256 },
  },
  BIG_TREE: {
    path: '/assets/isometric-plant-pack/bigtree01.png',
    category: 'tree',
    gridSize: 2,
    anchor: { x: 0.5, y: 0.8 },
    nativeSize: { width: 256, height: 320 },
  },
  BUSH: {
    path: '/assets/isometric-plant-pack/bush01.png',
    category: 'plant',
    gridSize: 1,
    anchor: { x: 0.5, y: 0.7 },
    nativeSize: { width: 128, height: 128 },
  },
  GRASS: {
    path: '/assets/isometric-plant-pack/grasses01.png',
    category: 'plant',
    gridSize: 1,
    anchor: { x: 0.5, y: 0.7 },
    nativeSize: { width: 128, height: 64 },
  },
  CACTUS: {
    path: '/assets/isometric-plant-pack/cactus01.png',
    category: 'plant',
    gridSize: 1,
    anchor: { x: 0.5, y: 0.7 },
    nativeSize: { width: 128, height: 160 },
  },
};

/**
 * Assets to preload on app initialization
 * These are critical assets that should be loaded immediately
 */
export const CRITICAL_ASSETS: string[] = [
  // All building sprites
  ...Object.values(BUILDING_SPRITES).map((sprite) => sprite.path),

  // Cursor sprites will be loaded when CursorManager is implemented
  // ...Object.values(CURSOR_SPRITES).map((cursor) => cursor.path),
];

/**
 * Assets to lazy load (decorations)
 * These can be loaded on demand when needed
 */
export const LAZY_LOAD_ASSETS: string[] = [
  ...Object.values(DECORATIONS).map((decoration) => decoration.path),
];

/**
 * Get sprite configuration for a building type
 * @param buildingType - The building type enum
 * @returns SpriteConfig for the building
 */
export function getBuildingSprite(buildingType: BuildingType): SpriteConfig {
  return BUILDING_SPRITES[buildingType] || BUILDING_SPRITES[BuildingType.TOWN_HALL];
}

/**
 * Get cursor configuration for a cursor state
 * @param state - The cursor state
 * @returns CursorConfig for the state
 */
export function getCursorSprite(state: CursorState): CursorConfig {
  return CURSOR_SPRITES[state] || CURSOR_SPRITES[CursorState.DEFAULT];
}

/**
 * Calculate sprite scale to fit grid tiles
 * @param spriteWidth - Native sprite width in pixels
 * @param spriteHeight - Native sprite height in pixels
 * @param gridTileSize - Size of one grid tile in pixels (e.g., 15px or 16px)
 * @param gridTileCount - Number of grid tiles the building occupies (e.g., 2 for 2x2)
 * @returns Scale factor to apply to sprite
 */
export function calculateSpriteScale(
  spriteWidth: number,
  spriteHeight: number,
  gridTileSize: number,
  gridTileCount: number
): number {
  const targetSize = gridTileSize * gridTileCount;
  // Scale based on the larger dimension to ensure it fits
  const maxDimension = Math.max(spriteWidth, spriteHeight);
  return targetSize / maxDimension;
}
