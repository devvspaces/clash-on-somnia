'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { battlesApi, BattleResult, PublicBattle } from '@/lib/api/battles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SlidePanel } from '@/components/ui/slide-panel';
import {
  Shield,
  Swords,
  Star,
  Coins,
  Droplet,
  Eye,
  Trophy,
  Skull,
  Target,
  Zap,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import {
  connectBattleSocket,
  registerForNotifications,
  onAttackNotification,
  offAttackNotification,
  AttackNotification
} from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

interface WarRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WarRoomModal({ isOpen, onClose }: WarRoomModalProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('defenses');
  const [attacks, setAttacks] = useState<BattleResult[]>([]);
  const [defenses, setDefenses] = useState<BattleResult[]>([]);
  const [liveBattles, setLiveBattles] = useState<PublicBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all battle data
  useEffect(() => {
    if (isOpen && user) {
      loadAllBattles();
      setupNotifications();
    }
  }, [isOpen, user]);

  const loadAllBattles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load attacks, defenses, and live battles in parallel
      const [attacksData, defensesData, liveData] = await Promise.all([
        battlesApi.getHistory(50),
        battlesApi.getDefenses(50),
        battlesApi.getRecentBattles(50),
      ]);

      setAttacks(attacksData.battles);
      setDefenses(defensesData.battles);

      // Filter live battles (status === 'active')
      const activeBattles = liveData.battles.filter(b => b.status === 'active');
      setLiveBattles(activeBattles);
    } catch (err: any) {
      console.error('Failed to load battles:', err);
      setError(err.response?.data?.message || 'Failed to load battles');
    } finally {
      setIsLoading(false);
    }
  };

  const setupNotifications = async () => {
    if (!token) return;

    try {
      // Connect to socket and register for notifications
      connectBattleSocket(token);
      await registerForNotifications();

      // Listen for attack notifications
      const handleAttackNotification = (notification: AttackNotification) => {
        console.log('Received attack notification:', notification);

        // Show toast notification
        toast({
          title: '🚨 Your village is under attack!',
          description: `${notification.attackerVillageName} is attacking you!`,
          action: (
            <Button
              size="sm"
              onClick={() => router.push(`/battle/${notification.battleId}/spectate?returnTo=/village`)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Spectate
            </Button>
          ),
          duration: 10000,
        });

        // Refresh battle lists
        loadAllBattles();
      };

      onAttackNotification(handleAttackNotification);

      return () => {
        offAttackNotification(handleAttackNotification);
      };
    } catch (err) {
      console.error('Failed to setup notifications:', err);
    }
  };

  const getBattleOutcome = (battle: BattleResult, isDefense: boolean): 'victory' | 'defeat' => {
    if (isDefense) {
      // For defenses, victory = attacker got 0 stars
      return battle.stars === 0 ? 'victory' : 'defeat';
    } else {
      // For attacks, victory = got any stars
      return battle.stars > 0 ? 'victory' : 'defeat';
    }
  };

  const renderBattleCard = (battle: BattleResult, isDefense: boolean) => {
    const outcome = getBattleOutcome(battle, isDefense);
    const isVictory = outcome === 'victory';

    return (
      <Card
        key={battle.id}
        className="overflow-hidden transition-all hover:shadow-md"
      >
        <CardContent className="p-3">
          {/* Header with Outcome Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isVictory ? (
                <Trophy className="h-5 w-5 text-green-500" />
              ) : (
                <Skull className="h-5 w-5 text-red-500" />
              )}
              <div>
                <Badge
                  variant={isVictory ? 'default' : 'destructive'}
                  className="text-xs px-2 py-0.5"
                >
                  {isVictory ? 'Victory' : 'Defeat'}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-0.5">
              {[1, 2, 3].map((starNum) => (
                <Star
                  key={starNum}
                  className={`h-4 w-4 ${
                    starNum <= battle.stars
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'fill-muted text-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Battle VS Display */}
          <div className="grid grid-cols-3 items-center gap-2 mb-2">
            <div className="text-center">
              {isDefense ? (
                <>
                  <Swords className="h-5 w-5 mx-auto mb-1 text-red-500" />
                  <p className="font-bold text-xs">Attacker</p>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="font-bold text-xs">You</p>
                </>
              )}
            </div>

            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto text-yellow-500" />
            </div>

            <div className="text-center">
              {isDefense ? (
                <>
                  <Shield className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="font-bold text-xs">You</p>
                </>
              ) : (
                <>
                  <Swords className="h-5 w-5 mx-auto mb-1 text-red-500" />
                  <p className="font-bold text-xs">Defender</p>
                </>
              )}
            </div>
          </div>

          {/* Destruction Bar */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Destruction
              </span>
              <span className="text-sm font-bold">
                {battle.destructionPercentage}%
              </span>
            </div>
            <Progress
              value={battle.destructionPercentage}
              className="h-2"
            />
          </div>

          {/* Loot Display */}
          {(battle.lootGold > 0 || battle.lootElixir > 0) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 p-2 bg-muted rounded">
                <Coins className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Gold</p>
                  <p className="font-bold text-yellow-500 text-xs">
                    {isDefense ? '-' : '+'}{battle.lootGold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-muted rounded">
                <Droplet className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Elixir</p>
                  <p className="font-bold text-purple-500 text-xs">
                    {isDefense ? '-' : '+'}{battle.lootElixir.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLiveBattleCard = (battle: PublicBattle) => {
    return (
      <Card
        key={battle.id}
        className="overflow-hidden border-orange-500"
      >
        <CardContent className="p-3">
          {/* Live Indicator */}
          <div className="flex items-center justify-between mb-2">
            <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
              LIVE NOW
            </Badge>
            <Button
              size="sm"
              onClick={() => router.push(`/battle/${battle.id}/spectate?returnTo=/village`)}
              className="h-7 text-xs px-2"
            >
              <Eye className="mr-1 h-3 w-3" />
              Spectate
            </Button>
          </div>

          {/* Battle Info */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-xs">{battle.attackerVillage.name}</p>
              <p className="text-[10px] text-muted-foreground">Attacker</p>
            </div>
            <Swords className="h-5 w-5 text-orange-500" />
            <div className="text-right">
              <p className="font-bold text-xs">{battle.defenderVillage.name}</p>
              <p className="text-[10px] text-muted-foreground">Defender</p>
            </div>
          </div>

          {/* Current Stats */}
          {battle.destructionPercentage > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Destruction</span>
                <span className="font-bold">{battle.destructionPercentage}%</span>
              </div>
              <Progress value={battle.destructionPercentage} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      width="600px"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-blue-500" />
        <h2 className="text-2xl font-bold">War Room</h2>
        <Swords className="h-6 w-6 text-red-500" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="defenses" className="text-sm">
            <Shield className="mr-1.5 h-4 w-4" />
            Defenses ({defenses.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="text-sm">
            <Bell className="mr-1.5 h-4 w-4" />
            Live ({liveBattles.length})
          </TabsTrigger>
          <TabsTrigger value="attacks" className="text-sm">
            <Swords className="mr-1.5 h-4 w-4" />
            Attacks ({attacks.length})
          </TabsTrigger>
        </TabsList>

        {/* Defense Log */}
        <TabsContent value="defenses" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading defenses...</p>
            </div>
          ) : defenses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-base font-semibold mb-1">No attacks yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your defenses remain untested.
                </p>
              </CardContent>
            </Card>
          ) : (
            defenses.map(battle => renderBattleCard(battle, true))
          )}
        </TabsContent>

        {/* Live Attacks */}
        <TabsContent value="live" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Scanning for battles...</p>
            </div>
          ) : liveBattles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-base font-semibold mb-1">No live attacks</h3>
                <p className="text-sm text-muted-foreground">
                  You'll see real-time battles here!
                </p>
              </CardContent>
            </Card>
          ) : (
            liveBattles.map(renderLiveBattleCard)
          )}
        </TabsContent>

        {/* Attack History */}
        <TabsContent value="attacks" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading attacks...</p>
            </div>
          ) : attacks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Swords className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-base font-semibold mb-1">No attacks launched</h3>
                <p className="text-sm text-muted-foreground">
                  Attack other villages to gain resources!
                </p>
              </CardContent>
            </Card>
          ) : (
            attacks.map(battle => renderBattleCard(battle, false))
          )}
        </TabsContent>
      </Tabs>
    </SlidePanel>
  );
}
