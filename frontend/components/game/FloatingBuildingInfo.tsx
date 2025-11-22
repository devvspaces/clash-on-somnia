'use client';

import { Building, resourcesApi } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useState } from 'react';

interface FloatingBuildingInfoProps {
  building: Building;
  onClose: () => void;
  isBuildingUnderConstruction: (building: Building) => boolean;
  getRemainingConstructionTime: (building: Building) => number;
  formatTime: (seconds: number) => string;
  onCollect: () => Promise<void>;
}

export function FloatingBuildingInfo({
  building,
  onClose,
  isBuildingUnderConstruction,
  getRemainingConstructionTime,
  formatTime,
  onCollect,
}: FloatingBuildingInfoProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const visualConfig = getBuildingVisual(building.type);

  const handleCollect = async () => {
    try {
      setIsCollecting(true);
      await resourcesApi.collectFromBuilding(building.id);
      await onCollect();
    } catch (error: any) {
      console.error('Failed to collect:', error);
      alert(error.message || 'Failed to collect resources');
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 w-80 animate-slide-in-bottom">
      <Card className="border-2 border-primary shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Building Info
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-bold text-lg">{visualConfig.name}</p>
            <p className="text-sm text-muted-foreground">Level {building.level}</p>
          </div>

          <div className="flex justify-between text-sm">
            <span>Health:</span>
            <span className="font-bold">
              {building.health} / {building.maxHealth}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Position:</span>
            <span className="font-bold">
              ({building.positionX}, {building.positionY})
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Status:</span>
            {isBuildingUnderConstruction(building) ? (
              <span className="font-bold text-orange-600">
                Under Construction ({formatTime(getRemainingConstructionTime(building))})
              </span>
            ) : (
              <span className={`font-bold ${building.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {building.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>

          {/* Collector-specific info (Gold Mine, Elixir Collector) */}
          {(building.type === 'gold_mine' || building.type === 'elixir_collector') && (
            <>
              {isBuildingUnderConstruction(building) ? (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground text-center">
                    This building will be functional once construction is complete.
                  </p>
                </div>
              ) : (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stored:</span>
                    <span className="font-bold text-green-600">
                      {building.type === 'gold_mine'
                        ? `${building.internalGold || 0} / ${building.internalGoldCapacity || 1000}`
                        : `${building.internalElixir || 0} / ${building.internalElixirCapacity || 1000}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Production Rate:</span>
                    <span className="font-bold">
                      {building.type === 'gold_mine' ? '50' : '40'}/hour
                    </span>
                  </div>
                  {((building.type === 'gold_mine' && building.internalGold > 0) ||
                    (building.type === 'elixir_collector' && building.internalElixir > 0)) && (
                    <Button
                      onClick={handleCollect}
                      className="w-full"
                      disabled={isCollecting}
                    >
                      {isCollecting ? 'Collecting...' : 'Collect'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Storage buildings info */}
          {(building.type === 'gold_storage' || building.type === 'elixir_storage') && (
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Capacity:</span>
                <span className="font-bold">10,000</span>
              </div>
            </div>
          )}

          {/* Defense buildings info */}
          {(building.type === 'cannon' || building.type === 'archer_tower') && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Damage:</span>
                <span className="font-bold text-red-600">
                  {building.type === 'cannon' ? '80' : '50'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Range:</span>
                <span className="font-bold">{building.type === 'cannon' ? '5' : '7'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Attack Speed:</span>
                <span className="font-bold">
                  {building.type === 'cannon' ? '1.5s' : '1.0s'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
