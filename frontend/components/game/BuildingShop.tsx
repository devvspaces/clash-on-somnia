'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Shield, Swords, Coins, Droplet, X, Clock } from 'lucide-react';
import { BuildingType } from '@/lib/config/buildingsData';
import { buildingsApi, BuildingConfig } from '@/lib/api/buildings';

interface BuildingShopProps {
  gold: number;
  elixir: number;
  onSelectBuilding: (buildingType: string) => void;
  onClose: () => void;
}

export function BuildingShop({ gold, elixir, onSelectBuilding, onClose }: BuildingShopProps) {
  const [selectedCategory, setSelectedCategory] = useState<'resource' | 'defense' | 'army'>('resource');
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, BuildingConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const configs = await buildingsApi.getBuildingConfigs();
        setBuildingConfigs(configs);
      } catch (error) {
        console.error('Failed to load building configs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfigs();
  }, []);

  if (isLoading || !buildingConfigs) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <p>Loading buildings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resourceBuildings = Object.values(buildingConfigs).filter(
    (b) => b.category === 'resource' && b.type !== 'town_hall',
  );

  const defenseBuildings = Object.values(buildingConfigs).filter((b) => b.category === 'defense');

  const armyBuildings = Object.values(buildingConfigs).filter((b) => b.category === 'army');

  const canAfford = (config: BuildingConfig) => {
    return gold >= config.baseCost.gold && elixir >= config.baseCost.elixir;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const BuildingCard = ({ config }: { config: BuildingConfig }) => {
    const affordable = canAfford(config);

    return (
      <Card className={`${!affordable ? 'opacity-50' : ''} transition-all hover:shadow-lg`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{config.name}</CardTitle>
          <CardDescription className="text-xs">{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {/* Cost - only show non-zero costs */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {config.baseCost.gold > 0 && (
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-gold" />
                  {config.baseCost.gold}
                </span>
              )}
              {config.baseCost.elixir > 0 && (
                <span className="flex items-center gap-1">
                  <Droplet className="h-4 w-4 text-elixir" />
                  {config.baseCost.elixir}
                </span>
              )}
            </div>

            {/* Building stats */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Size: {config.size.width}x{config.size.height}</div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Build Time: {formatTime(config.buildTime)}
              </div>
              {config.capacity && (
                <div>Capacity: {config.capacity}</div>
              )}
            </div>

            {/* Generation rate for collectors */}
            {config.generationRate && (
              <div className="text-xs font-medium text-green-600 dark:text-green-400">
                Generates +{config.generationRate}/hr
              </div>
            )}

            {/* Defense stats */}
            {config.defense && (
              <div className="text-xs space-y-1 border-t pt-2">
                <div className="font-semibold">Defense Stats:</div>
                <div>Damage: {config.defense.damage}</div>
                <div>Range: {config.defense.range}</div>
                <div>Attack Speed: {config.defense.attackSpeed}s</div>
              </div>
            )}
          </div>
          <Button
            onClick={() => onSelectBuilding(config.type)}
            disabled={!affordable}
            variant={affordable ? 'game' : 'outline'}
            className="w-full"
            size="sm"
          >
            {affordable ? 'Place' : 'Need Resources'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Building Shop</CardTitle>
              <CardDescription>Select a building to place in your village</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <Coins className="h-4 w-4 text-gold" />
              <span className="font-bold">{gold}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <Droplet className="h-4 w-4 text-elixir" />
              <span className="font-bold">{elixir}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resource">
                <Building2 className="mr-2 h-4 w-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="defense">
                <Shield className="mr-2 h-4 w-4" />
                Defense
              </TabsTrigger>
              <TabsTrigger value="army">
                <Swords className="mr-2 h-4 w-4" />
                Army
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resource" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resourceBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="defense" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {defenseBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="army" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {armyBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
