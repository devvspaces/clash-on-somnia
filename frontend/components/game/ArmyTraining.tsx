'use client';

import { useEffect, useState } from 'react';
import { troopsApi, TroopStats, TrainingQueueItem, ArmyTroop } from '@/lib/api/troops';
import { useVillageStore } from '@/lib/stores/useVillageStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ArmyTrainingProps {
  onClose: () => void;
}

export function ArmyTraining({ onClose }: ArmyTrainingProps) {
  const { village } = useVillageStore();

  const [availableTroops, setAvailableTroops] = useState<TroopStats[]>([]);
  const [trainingQueue, setTrainingQueue] = useState<TrainingQueueItem[]>([]);
  const [army, setArmy] = useState<ArmyTroop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [troops, queue, armyData] = await Promise.all([
        troopsApi.getAvailableTroops(),
        troopsApi.getTrainingQueue(),
        troopsApi.getArmy(),
      ]);
      setAvailableTroops(troops);
      setTrainingQueue(queue);
      setArmy(armyData);
    } catch (err: any) {
      console.error('Failed to load army data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload queue and army every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [queue, armyData] = await Promise.all([
          troopsApi.getTrainingQueue(),
          troopsApi.getArmy(),
        ]);
        setTrainingQueue(queue);
        setArmy(armyData);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTrainTroop = async (troopType: string) => {
    try {
      await troopsApi.trainTroop(troopType);
      await loadData();
      await useVillageStore.getState().fetchVillage();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to train troop');
    }
  };

  const handleCancelTraining = async (trainingId: string) => {
    if (!confirm('Cancel this training? You will get a refund.')) return;

    try {
      await troopsApi.cancelTraining(trainingId);
      await loadData();
      await useVillageStore.getState().fetchVillage();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel training');
    }
  };

  const calculateProgress = (item: TrainingQueueItem): number => {
    const now = new Date().getTime();
    const start = new Date(item.startedAt).getTime();
    const end = new Date(item.completesAt).getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getTimeRemaining = (completesAt: string): string => {
    const now = new Date().getTime();
    const end = new Date(completesAt).getTime();
    const remaining = Math.max(0, end - now);

    const seconds = Math.floor((remaining / 1000) % 60);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTotalHousingSpace = (): number => {
    return army.reduce((total, troop) => {
      return total + (troop.troopConfig.housingSpace * troop.count);
    }, 0);
  };

  const getQueueHousingSpace = (): number => {
    return trainingQueue.reduce((total, item) => {
      return total + item.troopConfig.housingSpace;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">Loading army data...</div>
    );
  }

  const totalHousingSpace = getTotalHousingSpace();
  const queueHousingSpace = getQueueHousingSpace();
  const maxCapacity = 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Army Camp</h2>
          <p className="text-sm text-muted-foreground">Train troops and manage your army</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Close Army
        </Button>
      </div>

      {/* Army Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Army Capacity</CardTitle>
          <CardDescription className="text-sm">
            {totalHousingSpace} / {maxCapacity} troops
            {queueHousingSpace > 0 && ` (+${queueHousingSpace} in training)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(totalHousingSpace / maxCapacity) * 100} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Training Queue */}
          {trainingQueue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Training Queue ({trainingQueue.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {trainingQueue.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <span className="text-2xl">{item.troopConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{item.troopConfig.name}</h3>
                          <Badge variant="secondary" className="text-xs">#{item.queuePosition + 1}</Badge>
                        </div>
                        <div className="mt-1 space-y-1">
                          <Progress value={calculateProgress(item)} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            {getTimeRemaining(item.completesAt)} remaining
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelTraining(item.id)}
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          {/* Current Army */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Army</CardTitle>
            </CardHeader>
            <CardContent>
              {army.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No troops trained yet
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {army.map((troop) => (
                    <div key={troop.id} className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-2xl">{troop.troopConfig.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{troop.troopConfig.name}</p>
                        <p className="text-lg font-bold text-primary">{troop.count}x</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Train Troops */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Train Troops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableTroops.map((troop) => {
                const canAfford = village && village.resources.elixir >= troop.cost.elixir;
                const hasSpace = totalHousingSpace + queueHousingSpace + troop.housingSpace <= maxCapacity;

                return (
                  <div key={troop.type} className="border rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{troop.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{troop.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{troop.description}</p>

                        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                          <div><span className="text-muted-foreground">HP:</span> {troop.health}</div>
                          <div><span className="text-muted-foreground">DMG:</span> {troop.damage}</div>
                          <div><span className="text-muted-foreground">Range:</span> {troop.range}</div>
                          <div><span className="text-muted-foreground">Space:</span> {troop.housingSpace}</div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold">💧 {troop.cost.elixir}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {troop.trainingTime}s</p>
                          </div>
                          <Button
                            onClick={() => handleTrainTroop(troop.type)}
                            disabled={!canAfford || !hasSpace}
                            size="sm"
                          >
                            {!hasSpace ? 'Full' : !canAfford ? 'Not enough' : 'Train'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
