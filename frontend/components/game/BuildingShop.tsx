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
      <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="h-full w-full max-w-3xl ml-auto animate-slide-in-right bg-gray-900 shadow-2xl overflow-auto p-6">
          <div className="text-center py-12 text-xl text-amber-400">Loading buildings...</div>
        </div>
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
      <Card className={`${!affordable ? 'opacity-50' : ''} bg-gray-800/90 border-2 border-gray-700 hover:border-amber-500/50 transition-all`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">{config.name}</CardTitle>
          <CardDescription className="text-xs text-gray-400">{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {/* Cost - only show non-zero costs */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {config.baseCost.gold > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-numbers">
                  <Coins className="h-4 w-4" />
                  {config.baseCost.gold}
                </span>
              )}
              {config.baseCost.elixir > 0 && (
                <span className="flex items-center gap-1 text-cyan-400 font-numbers">
                  <Droplet className="h-4 w-4" />
                  {config.baseCost.elixir}
                </span>
              )}
            </div>

            {/* Building stats */}
            <div className="space-y-1 text-xs text-gray-300">
              <div>Size: <span className="font-numbers text-white">{config.size.width}x{config.size.height}</span></div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Build Time: <span className="font-numbers text-white">{formatTime(config.buildTime)}</span>
              </div>
              {config.capacity && (
                <div>Capacity: <span className="font-numbers text-white">{config.capacity}</span></div>
              )}
            </div>

            {/* Generation rate for collectors */}
            {config.generationRate && (
              <div className="text-xs font-medium text-green-400 font-numbers">
                Generates +{config.generationRate}/hr
              </div>
            )}

            {/* Defense stats */}
            {config.defense && (
              <div className="text-xs space-y-1 border-t border-gray-700 pt-2 text-gray-300">
                <div className="font-semibold text-red-400">Defense Stats:</div>
                <div>Damage: <span className="font-numbers text-red-400">{config.defense.damage}</span></div>
                <div>Range: <span className="font-numbers text-blue-400">{config.defense.range}</span></div>
                <div>Attack Speed: <span className="font-numbers text-yellow-400">{config.defense.attackSpeed}s</span></div>
              </div>
            )}
          </div>
          <Button
            onClick={() => onSelectBuilding(config.type)}
            disabled={!affordable}
            className={affordable ? 'w-full bg-amber-600 hover:bg-amber-700' : 'w-full'}
            size="sm"
          >
            {affordable ? 'Place' : 'Need Resources'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-3xl ml-auto animate-slide-in-right bg-gray-900 shadow-2xl overflow-auto p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-amber-500 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-amber-400">Building Shop</h2>
              <p className="text-sm text-gray-400">Select a building to place in your village</p>
            </div>
            <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>

          {/* Resources Display */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-gray-800 border border-yellow-600/50 px-4 py-2">
              <Coins className="h-5 w-5 text-yellow-400" />
              <span className="font-bold text-yellow-400 font-numbers">{gold}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-800 border border-cyan-600/50 px-4 py-2">
              <Droplet className="h-5 w-5 text-cyan-400" />
              <span className="font-bold text-cyan-400 font-numbers">{elixir}</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
              <TabsTrigger value="resource" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Building2 className="mr-2 h-4 w-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="defense" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Shield className="mr-2 h-4 w-4" />
                Defense
              </TabsTrigger>
              <TabsTrigger value="army" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Swords className="mr-2 h-4 w-4" />
                Army
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resource" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {resourceBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="defense" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {defenseBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="army" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {armyBuildings.map((building) => (
                  <BuildingCard key={building.type} config={building} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
