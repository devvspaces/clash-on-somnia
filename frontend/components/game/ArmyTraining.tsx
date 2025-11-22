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
      <div className="text-center py-12 text-xl text-amber-400">Loading army data...</div>
    );
  }

  const totalHousingSpace = getTotalHousingSpace();
  const queueHousingSpace = getQueueHousingSpace();
  const maxCapacity = 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-amber-500 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-amber-400">Army Camp</h2>
          <p className="text-sm text-gray-400">Train troops and manage your army</p>
        </div>
        <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </div>

      {/* Army Capacity */}
      <Card className="bg-gray-800/90 border-2 border-amber-600/50">
        <CardHeader>
          <CardTitle className="text-lg text-amber-300">Army Capacity</CardTitle>
          <CardDescription className="text-base text-gray-300 font-numbers">
            {totalHousingSpace} / {maxCapacity} troops
            {queueHousingSpace > 0 && ` (+${queueHousingSpace} in training)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(totalHousingSpace / maxCapacity) * 100} className="h-4 bg-gray-700" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Training Queue */}
        {trainingQueue.length > 0 && (
          <Card className="bg-gray-800/90 border-2 border-blue-600/50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-300">Training Queue ({trainingQueue.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {trainingQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-3 p-3 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-blue-500/50 transition-colors"
                  >
                    <span className="text-3xl">{item.troopConfig.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white">{item.troopConfig.name}</h3>
                        <Badge variant="secondary" className="text-xs bg-blue-600 text-white">#{item.queuePosition + 1}</Badge>
                      </div>
                      <div className="mt-1 space-y-1">
                        <Progress value={calculateProgress(item)} className="h-2 bg-gray-700" />
                        <p className="text-xs text-gray-400 font-numbers">
                          {getTimeRemaining(item.completesAt)} remaining
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelTraining(item.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

        {/* Your Army */}
        <Card className="bg-gray-800/90 border-2 border-green-600/50">
          <CardHeader>
            <CardTitle className="text-lg text-green-300">Your Army</CardTitle>
          </CardHeader>
          <CardContent>
            {army.length === 0 ? (
              <p className="text-center text-base text-gray-400 py-6">
                No troops trained yet
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {army.map((troop) => (
                  <div key={troop.id} className="flex items-center gap-3 p-3 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-green-500/50 transition-colors">
                    <span className="text-3xl">{troop.troopConfig.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{troop.troopConfig.name}</p>
                      <p className="text-xl font-bold text-green-400 font-numbers">{troop.count}x</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Train Troops */}
        <Card className="bg-gray-800/90 border-2 border-purple-600/50">
          <CardHeader>
            <CardTitle className="text-lg text-purple-300">Train Troops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableTroops.map((troop) => {
                const canAfford = village && village.resources.elixir >= troop.cost.elixir;
                const hasSpace = totalHousingSpace + queueHousingSpace + troop.housingSpace <= maxCapacity;

                return (
                  <div key={troop.type} className="bg-gray-900/50 border-2 border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">{troop.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-white">{troop.name}</h3>
                        <p className="text-sm text-gray-400 mb-3">{troop.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="text-gray-300"><span className="text-gray-500">HP:</span> <span className="font-numbers text-green-400">{troop.health}</span></div>
                          <div className="text-gray-300"><span className="text-gray-500">DMG:</span> <span className="font-numbers text-red-400">{troop.damage}</span></div>
                          <div className="text-gray-300"><span className="text-gray-500">Range:</span> <span className="font-numbers text-blue-400">{troop.range}</span></div>
                          <div className="text-gray-300"><span className="text-gray-500">Space:</span> <span className="font-numbers text-yellow-400">{troop.housingSpace}</span></div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-cyan-400 font-numbers">💧 {troop.cost.elixir}</p>
                            <p className="text-xs text-gray-400 font-numbers">⏱️ {troop.trainingTime}s</p>
                          </div>
                          <Button
                            onClick={() => handleTrainTroop(troop.type)}
                            disabled={!canAfford || !hasSpace}
                            size="sm"
                            className={canAfford && hasSpace ? "bg-purple-600 hover:bg-purple-700" : ""}
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
