'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Shield, Swords, Coins, Droplet, X } from 'lucide-react';
import { BuildingType, BUILDING_CONFIGS, getBuildingConfig } from '@/lib/config/buildingsData';

interface BuildingShopProps {
  gold: number;
  elixir: number;
  onSelectBuilding: (buildingType: BuildingType) => void;
  onClose: () => void;
}

export function BuildingShop({ gold, elixir, onSelectBuilding, onClose }: BuildingShopProps) {
  const [selectedCategory, setSelectedCategory] = useState<'resource' | 'defense' | 'army'>('resource');

  const resourceBuildings = Object.values(BUILDING_CONFIGS).filter(
    (b) => b.category === 'resource' && b.type !== BuildingType.TOWN_HALL,
  );

  const defenseBuildings = Object.values(BUILDING_CONFIGS).filter((b) => b.category === 'defense');

  const armyBuildings = Object.values(BUILDING_CONFIGS).filter((b) => b.category === 'army');

  const canAfford = (buildingType: BuildingType) => {
    const config = getBuildingConfig(buildingType);
    return gold >= config.baseCost.gold && elixir >= config.baseCost.elixir;
  };

  const BuildingCard = ({ buildingType }: { buildingType: BuildingType }) => {
    const config = getBuildingConfig(buildingType);
    const affordable = canAfford(buildingType);

    return (
      <Card className={`${!affordable ? 'opacity-50' : ''} transition-all hover:shadow-lg`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{config.name}</CardTitle>
          <CardDescription className="text-xs">{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-gold" />
                {config.baseCost.gold}
              </span>
              <span className="flex items-center gap-1">
                <Droplet className="h-4 w-4 text-elixir" />
                {config.baseCost.elixir}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Size: {config.size.width}x{config.size.height}
            </div>
            {config.generationRate && (
              <div className="text-xs text-green-600 dark:text-green-400">
                +{config.generationRate}/hr
              </div>
            )}
          </div>
          <Button
            onClick={() => onSelectBuilding(buildingType)}
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
                  <BuildingCard key={building.type} buildingType={building.type} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="defense" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {defenseBuildings.map((building) => (
                  <BuildingCard key={building.type} buildingType={building.type} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="army" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {armyBuildings.map((building) => (
                  <BuildingCard key={building.type} buildingType={building.type} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
