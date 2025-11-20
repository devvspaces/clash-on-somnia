'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useVillageStore } from '@/lib/stores';
import { Navbar } from '@/components/layout/Navbar';
import { VillageCanvasPlacement } from '@/components/game/VillageCanvasPlacement';
import { BuildingShop } from '@/components/game/BuildingShop';
import { ArmyTraining } from '@/components/game/ArmyTraining';
import { BattlePreparation } from '@/components/game/BattlePreparation';
import { BattleResult } from '@/components/game/BattleResult';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Swords, Info, Plus, Trash2, History } from 'lucide-react';
import { resourcesApi, buildingsApi, Building, ResourcesWithPending } from '@/lib/api';
import { BattleSession } from '@/lib/api/battles';
import { getBuildingVisual } from '@/lib/config/buildings';
import { BuildingType } from '@/lib/config/buildingsData';

export default function VillagePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { village, isLoading: villageLoading, fetchVillage, silentRefresh, updateResources, addBuilding } = useVillageStore();
  const [resources, setResources] = useState<ResourcesWithPending | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [showBuildingShop, setShowBuildingShop] = useState(false);
  const [showArmyTraining, setShowArmyTraining] = useState(false);
  const [showBattlePrep, setShowBattlePrep] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [placementMode, setPlacementMode] = useState<{
    active: boolean;
    buildingType: BuildingType;
  } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Helper function to check if building is under construction
  const isBuildingUnderConstruction = (building: Building): boolean => {
    const now = new Date();
    const completedAt = new Date(building.constructionCompletedAt);
    return now < completedAt;
  };

  // Helper function to get remaining construction time in seconds
  const getRemainingConstructionTime = (building: Building): number => {
    const now = new Date();
    const completedAt = new Date(building.constructionCompletedAt);
    return Math.max(0, Math.floor((completedAt.getTime() - now.getTime()) / 1000));
  };

  // Helper function to format time (seconds to human readable)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !village && !villageLoading) {
      fetchVillage();
    }
  }, [isAuthenticated, village, villageLoading, fetchVillage]);

  // Poll village data every 30 seconds to update collector internal storage
  useEffect(() => {
    if (isAuthenticated && village) {
      const interval = setInterval(() => {
        silentRefresh(); // Silent refresh to avoid full page re-render
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, village, silentRefresh]);

  // Fetch resources with pending amounts
  useEffect(() => {
    if (isAuthenticated && village) {
      loadResources();
      // Refresh resources every 30 seconds
      const interval = setInterval(loadResources, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, village]);

  const loadResources = async () => {
    try {
      const data = await resourcesApi.getMyResources();
      setResources(data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const handleCollectResources = async () => {
    setIsLoadingResources(true);
    try {
      const response = await resourcesApi.collectResources();
      updateResources(response.resources.gold, response.resources.elixir);
      await loadResources();
    } catch (error) {
      console.error('Failed to collect resources:', error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
  };

  const handleSelectBuildingToBuild = (buildingType: BuildingType) => {
    setShowBuildingShop(false);
    setPlacementMode({
      active: true,
      buildingType,
    });
  };

  const handlePlaceBuilding = async (x: number, y: number) => {
    if (!placementMode) return;

    setIsPlacing(true);
    try {
      const response = await buildingsApi.placeBuilding({
        type: placementMode.buildingType,
        positionX: x,
        positionY: y,
      });

      // Add building to local state
      addBuilding(response.building);

      // Refresh resources to reflect deduction
      await loadResources();
      await fetchVillage();

      // Exit placement mode
      setPlacementMode(null);
    } catch (error: any) {
      console.error('Failed to place building:', error);
      alert(error.response?.data?.message || 'Failed to place building');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleCancelPlacement = () => {
    setPlacementMode(null);
  };

  const handleMoveBuilding = async (buildingId: string, x: number, y: number) => {
    try {
      await buildingsApi.moveBuilding(buildingId, { positionX: x, positionY: y });
      await fetchVillage(); // Refresh village to get updated positions
    } catch (error: any) {
      console.error('Failed to move building:', error);
      alert(error.response?.data?.message || 'Failed to move building');
    }
  };

  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;

    if (!confirm(`Are you sure you want to delete this ${getBuildingVisual(selectedBuilding.type).name}?`)) {
      return;
    }

    try {
      await buildingsApi.deleteBuilding(selectedBuilding.id);
      await fetchVillage();
      setSelectedBuilding(null);
    } catch (error: any) {
      console.error('Failed to delete building:', error);
      alert(error.response?.data?.message || 'Failed to delete building');
    }
  };

  const handleStartRealtimeBattle = (battleSession: BattleSession, troops: { type: string; count: number }[]) => {
    setShowBattlePrep(false);

    // Navigate to battle page with session data
    const params = new URLSearchParams({
      battleId: battleSession.battleId,
      villageId: village!.id,
      troops: JSON.stringify(troops),
      session: JSON.stringify(battleSession.session),
    });

    router.push(`/battle?${params.toString()}`);
  };

  const handleBattleComplete = (result: any) => {
    setShowBattlePrep(false);
    setBattleResult(result);
    // Refresh resources to show looted resources
    loadResources();
  };

  const handleCloseBattleResult = () => {
    setBattleResult(null);
  };

  if (authLoading || villageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading your village...</h2>
          <p className="mt-2 text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!village) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Village not found</h2>
          <p className="mt-2 text-muted-foreground">Unable to load your village</p>
        </div>
      </div>
    );
  }

  const goldMines = village.buildings.filter((b) => b.type === 'gold_mine').length;
  const elixirCollectors = village.buildings.filter((b) => b.type === 'elixir_collector').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 dark:from-green-950 dark:via-blue-950 dark:to-purple-950">
      <Navbar />

      <div className="container mx-auto p-6">
        {showArmyTraining ? (
          <ArmyTraining onClose={() => setShowArmyTraining(false)} />
        ) : battleResult ? (
          <BattleResult result={battleResult} onClose={handleCloseBattleResult} />
        ) : showBattlePrep ? (
          <BattlePreparation
            onBattleComplete={handleBattleComplete}
            onStartRealtimeBattle={handleStartRealtimeBattle}
            onCancel={() => setShowBattlePrep(false)}
          />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{village.name}</h1>
                <p className="text-muted-foreground">Welcome back, Chief!</p>
              </div>
              <Button
                onClick={() => setShowBuildingShop(true)}
                variant="game"
                size="lg"
                disabled={placementMode?.active}
              >
                <Plus className="mr-2 h-5 w-5" />
                Build
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Buildings
                </CardTitle>
                <CardDescription>Your village structures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Buildings:</span>
                  <span className="font-bold">{village.buildings.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gold Mines:</span>
                  <span className="font-bold">{goldMines}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Elixir Collectors:</span>
                  <span className="font-bold">{elixirCollectors}</span>
                </div>
              </CardContent>
            </Card>

            {selectedBuilding && !placementMode?.active && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Building Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-bold">{getBuildingVisual(selectedBuilding.type).name}</p>
                    <p className="text-sm text-muted-foreground">Level {selectedBuilding.level}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Health:</span>
                    <span className="font-bold">
                      {selectedBuilding.health} / {selectedBuilding.maxHealth}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Position:</span>
                    <span className="font-bold">
                      ({selectedBuilding.positionX}, {selectedBuilding.positionY})
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    {isBuildingUnderConstruction(selectedBuilding) ? (
                      <span className="font-bold text-orange-600">
                        Under Construction ({formatTime(getRemainingConstructionTime(selectedBuilding))})
                      </span>
                    ) : (
                      <span className={`font-bold ${selectedBuilding.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedBuilding.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Collector-specific info (Gold Mine, Elixir Collector) */}
                  {(selectedBuilding.type === 'gold_mine' || selectedBuilding.type === 'elixir_collector') && (
                    <>
                      {isBuildingUnderConstruction(selectedBuilding) ? (
                        <div className="border-t pt-3">
                          <p className="text-sm text-muted-foreground text-center">
                            This building will be functional once construction is complete.
                          </p>
                        </div>
                      ) : (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground">Internal Storage</p>
                          {selectedBuilding.type === 'gold_mine' && (
                            <div className="flex justify-between text-sm">
                              <span>Gold Stored:</span>
                              <span className="font-bold text-yellow-600">
                                {selectedBuilding.internalGold} / {selectedBuilding.internalGoldCapacity}
                              </span>
                            </div>
                          )}
                          {selectedBuilding.type === 'elixir_collector' && (
                            <div className="flex justify-between text-sm">
                              <span>Elixir Stored:</span>
                              <span className="font-bold text-purple-600">
                                {selectedBuilding.internalElixir} / {selectedBuilding.internalElixirCapacity}
                              </span>
                            </div>
                          )}
                          {(selectedBuilding.internalGold > 0 || selectedBuilding.internalElixir > 0) && (
                            <Button
                              onClick={async () => {
                                try {
                                  setIsLoadingResources(true);
                                  const result = await resourcesApi.collectFromBuilding(selectedBuilding.id);
                                  updateResources(result.resources.gold, result.resources.elixir);
                                  await loadResources();
                                  await fetchVillage();
                                } catch (error) {
                                  console.error('Failed to collect from building:', error);
                                } finally {
                                  setIsLoadingResources(false);
                                }
                              }}
                              variant="default"
                              size="sm"
                              className="w-full"
                              disabled={isLoadingResources}
                            >
                              Collect
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Storage-specific info (Gold Storage, Elixir Storage) */}
                  {(selectedBuilding.type === 'gold_storage' || selectedBuilding.type === 'elixir_storage') && resources && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Capacity</p>
                      {selectedBuilding.type === 'gold_storage' && (
                        <div className="flex justify-between text-sm">
                          <span>Gold Capacity:</span>
                          <span className="font-bold text-yellow-600">
                            {resources.gold} / {resources.capacity.gold}
                          </span>
                        </div>
                      )}
                      {selectedBuilding.type === 'elixir_storage' && (
                        <div className="flex justify-between text-sm">
                          <span>Elixir Capacity:</span>
                          <span className="font-bold text-purple-600">
                            {resources.elixir} / {resources.capacity.elixir}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Army Camp specific */}
                  {selectedBuilding.type === 'army_camp' && (
                    <div className="border-t pt-3">
                      <Button
                        onClick={() => setShowArmyTraining(true)}
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Train Troops
                      </Button>
                    </div>
                  )}

                  {selectedBuilding.type !== 'town_hall' && (
                    <Button
                      onClick={handleDeleteBuilding}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Building
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!placementMode?.active && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Battles
                  </CardTitle>
                  <CardDescription>Attack other villages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => setShowBattlePrep(true)}
                    className="w-full"
                    variant="destructive"
                  >
                    <Swords className="mr-2 h-4 w-4" />
                    Attack!
                  </Button>
                  <Button
                    onClick={() => router.push('/battles')}
                    className="w-full"
                    variant="outline"
                  >
                    <History className="mr-2 h-4 w-4" />
                    Battle History
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Village Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Village</CardTitle>
                <CardDescription>
                  {placementMode?.active
                    ? 'Click on the grid to place your building • Right-click to cancel'
                    : `Click on buildings to see details • ${village.buildings.length} buildings placed`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VillageCanvasPlacement
                  buildings={village.buildings}
                  onBuildingClick={handleBuildingClick}
                  onBuildingMove={handleMoveBuilding}
                  placementMode={
                    placementMode
                      ? {
                          active: true,
                          buildingType: placementMode.buildingType,
                          onPlace: handlePlaceBuilding,
                          onCancel: handleCancelPlacement,
                        }
                      : undefined
                  }
                />
                {!placementMode?.active && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p>Combat system is live! Attack other villages and loot resources.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Building Shop Modal */}
      {showBuildingShop && resources && (
        <BuildingShop
          gold={resources.gold}
          elixir={resources.elixir}
          onSelectBuilding={handleSelectBuildingToBuild}
          onClose={() => setShowBuildingShop(false)}
        />
      )}
    </div>
  );
}
