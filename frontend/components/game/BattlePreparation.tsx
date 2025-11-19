'use client';

import { useState, useEffect } from 'react';
import { battlesApi, OpponentVillage } from '@/lib/api/battles';
import { troopsApi, ArmyTroop } from '@/lib/api/troops';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Swords, AlertCircle, CheckCircle, Users, Target } from 'lucide-react';

interface BattlePreparationProps {
  onBattleComplete: (battleResult: any) => void;
  onCancel: () => void;
}

export function BattlePreparation({ onBattleComplete, onCancel }: BattlePreparationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [opponent, setOpponent] = useState<OpponentVillage | null>(null);
  const [army, setArmy] = useState<ArmyTroop[]>([]);
  const [selectedTroops, setSelectedTroops] = useState<{ type: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load army and find opponent in parallel
      const [armyData, opponentData] = await Promise.all([
        troopsApi.getArmy(),
        battlesApi.findOpponent(),
      ]);

      setArmy(armyData);
      setOpponent(opponentData);
    } catch (err: any) {
      console.error('Failed to load battle data:', err);
      setError(err.response?.data?.message || 'Failed to load battle data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTroop = (troopType: string, count: number) => {
    const existing = selectedTroops.find((t) => t.type === troopType);

    if (existing) {
      if (count === 0) {
        setSelectedTroops(selectedTroops.filter((t) => t.type !== troopType));
      } else {
        setSelectedTroops(
          selectedTroops.map((t) => (t.type === troopType ? { ...t, count } : t))
        );
      }
    } else if (count > 0) {
      setSelectedTroops([...selectedTroops, { type: troopType, count }]);
    }
  };

  const incrementTroop = (troopType: string) => {
    const troopData = army.find((t) => t.troopType === troopType);
    if (!troopData) return;

    const currentSelected = selectedTroops.find((t) => t.type === troopType)?.count || 0;
    if (currentSelected < troopData.count) {
      handleSelectTroop(troopType, currentSelected + 1);
    }
  };

  const decrementTroop = (troopType: string) => {
    const currentSelected = selectedTroops.find((t) => t.type === troopType)?.count || 0;
    if (currentSelected > 0) {
      handleSelectTroop(troopType, currentSelected - 1);
    }
  };

  const selectAllTroops = (troopType: string) => {
    const troopData = army.find((t) => t.troopType === troopType);
    if (troopData) {
      handleSelectTroop(troopType, troopData.count);
    }
  };

  const getTotalSelectedTroops = () => {
    return selectedTroops.reduce((total, t) => total + t.count, 0);
  };

  const handleAttack = async () => {
    if (!opponent || selectedTroops.length === 0) return;

    try {
      setIsAttacking(true);
      setError(null);

      const result = await battlesApi.attack(opponent.opponentVillageId, selectedTroops);

      // Show result
      onBattleComplete(result.battle);
    } catch (err: any) {
      console.error('Attack failed:', err);
      setError(err.response?.data?.message || 'Attack failed');
      setIsAttacking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Finding opponent and loading your army...</p>
      </div>
    );
  }

  if (error && !opponent) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline">
            <Loader2 className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6" />
            Battle Preparation
          </h2>
          <p className="text-sm text-muted-foreground">Select troops to deploy in battle</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Opponent Info */}
      {opponent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              Target Village
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Enemy Village</p>
                <p className="text-sm text-muted-foreground">Ready to attack</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troop Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deploy Troops</CardTitle>
          <CardDescription>
            Selected: {getTotalSelectedTroops()} troops
          </CardDescription>
        </CardHeader>
        <CardContent>
          {army.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have any troops! Train some troops before attacking.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {army.map((troop) => {
                const selected = selectedTroops.find((t) => t.type === troop.troopType)?.count || 0;
                const available = troop.count;

                return (
                  <div key={troop.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{troop.troopConfig.icon}</span>
                      <div>
                        <p className="font-semibold">{troop.troopConfig.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Available: {available}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => decrementTroop(troop.troopType)}
                        disabled={selected === 0}
                      >
                        -
                      </Button>
                      <span className="min-w-[3rem] text-center font-bold text-lg">
                        {selected}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementTroop(troop.troopType)}
                        disabled={selected >= available}
                      >
                        +
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => selectAllTroops(troop.troopType)}
                        disabled={selected === available}
                      >
                        All
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attack Button */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <p className="font-semibold">Ready to attack?</p>
          <p className="text-sm text-muted-foreground">
            {selectedTroops.length === 0
              ? 'Select troops to begin the attack'
              : `${getTotalSelectedTroops()} troops selected`}
          </p>
        </div>
        <Button
          onClick={handleAttack}
          disabled={selectedTroops.length === 0 || isAttacking}
          size="lg"
          className="min-w-[120px]"
        >
          {isAttacking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Attacking...
            </>
          ) : (
            <>
              <Swords className="mr-2 h-4 w-4" />
              Attack!
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
