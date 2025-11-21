'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { battlesApi, BattleResult, PublicBattle } from '@/lib/api/battles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Swords,
  Star,
  Coins,
  Droplet,
  Eye,
  Play,
  Trophy,
  Skull,
  Target,
  Zap,
  AlertTriangle,
  Bell,
  Home,
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

export default function WarRoomPage() {
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
    if (user) {
      loadAllBattles();
      setupNotifications();
    }
  }, [user]);

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
              onClick={() => router.push(`/battle/${notification.battleId}/spectate`)}
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
        className={`
          overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl
          ${isVictory ? 'border-green-500/50 bg-gradient-to-br from-green-950/20 to-transparent' : 'border-red-500/50 bg-gradient-to-br from-red-950/20 to-transparent'}
        `}
      >
        <CardContent className="p-6">
          {/* Header with Outcome Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isVictory ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20">
                  <Trophy className="h-6 w-6 text-green-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20">
                  <Skull className="h-6 w-6 text-red-500" />
                </div>
              )}
              <div>
                <Badge
                  variant={isVictory ? 'default' : 'destructive'}
                  className="text-lg px-4 py-1 font-bold"
                >
                  {isVictory ? '⚔️ VICTORY' : '💀 DEFEAT'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-1">
              {[1, 2, 3].map((starNum) => (
                <Star
                  key={starNum}
                  className={`h-6 w-6 ${
                    starNum <= battle.stars
                      ? 'fill-yellow-500 text-yellow-500 animate-pulse'
                      : 'fill-gray-700 text-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Battle VS Display */}
          <div className="grid grid-cols-3 items-center gap-4 mb-6">
            <div className="text-center">
              {isDefense ? (
                <>
                  <Swords className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="font-bold text-sm">Attacker</p>
                  <p className="text-xs text-muted-foreground">Enemy Village</p>
                </>
              ) : (
                <>
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-bold text-sm">You</p>
                  <p className="text-xs text-muted-foreground">Attacker</p>
                </>
              )}
            </div>

            <div className="text-center">
              <Zap className="h-10 w-10 mx-auto text-yellow-500 animate-pulse" />
              <p className="text-xs font-bold text-yellow-500">VS</p>
            </div>

            <div className="text-center">
              {isDefense ? (
                <>
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-bold text-sm">You</p>
                  <p className="text-xs text-muted-foreground">Defender</p>
                </>
              ) : (
                <>
                  <Swords className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="font-bold text-sm">Defender</p>
                  <p className="text-xs text-muted-foreground">Enemy Village</p>
                </>
              )}
            </div>
          </div>

          {/* Destruction Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <Target className="h-4 w-4 text-orange-500" />
                Destruction
              </span>
              <span className="text-xl font-bold text-orange-500">
                {battle.destructionPercentage}%
              </span>
            </div>
            <Progress
              value={battle.destructionPercentage}
              className="h-3 bg-gray-800"
            />
          </div>

          {/* Loot Display */}
          {(battle.lootGold > 0 || battle.lootElixir > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Coins className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="text-xs text-yellow-500/80">Gold</p>
                  <p className="font-bold text-yellow-500 text-lg">
                    {isDefense ? '-' : '+'}{battle.lootGold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Droplet className="h-6 w-6 text-purple-500" />
                <div>
                  <p className="text-xs text-purple-500/80">Elixir</p>
                  <p className="font-bold text-purple-500 text-lg">
                    {isDefense ? '-' : '+'}{battle.lootElixir.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/battle/${battle.id}`)}
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Replay
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLiveBattleCard = (battle: PublicBattle) => {
    return (
      <Card
        key={battle.id}
        className="overflow-hidden border-orange-500/50 bg-gradient-to-br from-orange-950/30 to-transparent animate-pulse"
      >
        <CardContent className="p-6">
          {/* Live Indicator */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant="destructive" className="text-lg px-4 py-1 animate-pulse">
              🔴 LIVE NOW
            </Badge>
            <Button
              size="sm"
              onClick={() => router.push(`/battle/${battle.id}/spectate`)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Eye className="mr-2 h-4 w-4" />
              Spectate Now
            </Button>
          </div>

          {/* Battle Info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold">{battle.attackerVillage.name}</p>
              <p className="text-xs text-muted-foreground">Attacker</p>
            </div>
            <Swords className="h-8 w-8 text-orange-500" />
            <div className="text-right">
              <p className="font-bold">{battle.defenderVillage.name}</p>
              <p className="text-xs text-muted-foreground">Defender</p>
            </div>
          </div>

          {/* Current Stats */}
          {battle.destructionPercentage > 0 && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Destruction</span>
                <span className="font-bold">{battle.destructionPercentage}%</span>
              </div>
              <Progress value={battle.destructionPercentage} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header - More Game-Like */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
              War Room
            </h1>
            <Swords className="h-12 w-12 text-red-500" />
          </div>
          <p className="text-xl text-muted-foreground">
            Command your forces • Track your victories • Defend your honor
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push('/village')}>
              <Home className="mr-2 h-4 w-4" />
              Return to Village
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-14">
            <TabsTrigger value="defenses" className="text-lg">
              <Shield className="mr-2 h-5 w-5" />
              Defense Log ({defenses.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="text-lg">
              <Bell className="mr-2 h-5 w-5" />
              Live Attacks ({liveBattles.length})
            </TabsTrigger>
            <TabsTrigger value="attacks" className="text-lg">
              <Swords className="mr-2 h-5 w-5" />
              Attack History ({attacks.length})
            </TabsTrigger>
          </TabsList>

          {/* Defense Log */}
          <TabsContent value="defenses" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading defense reports...</p>
              </div>
            ) : defenses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No attacks against your village</h3>
                  <p className="text-muted-foreground">
                    Your defenses remain untested. Prepare for incoming attacks!
                  </p>
                </CardContent>
              </Card>
            ) : (
              defenses.map(battle => renderBattleCard(battle, true))
            )}
          </TabsContent>

          {/* Live Attacks */}
          <TabsContent value="live" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Scanning for live battles...</p>
              </div>
            ) : liveBattles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No live attacks</h3>
                  <p className="text-muted-foreground">
                    When someone attacks your village, you'll see it here in real-time!
                  </p>
                </CardContent>
              </Card>
            ) : (
              liveBattles.map(renderLiveBattleCard)
            )}
          </TabsContent>

          {/* Attack History */}
          <TabsContent value="attacks" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading attack history...</p>
              </div>
            ) : attacks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Swords className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No attacks launched</h3>
                  <p className="text-muted-foreground mb-4">
                    Begin your conquest! Attack other villages to gain resources and glory.
                  </p>
                  <Button onClick={() => router.push('/village')}>
                    <Swords className="mr-2 h-4 w-4" />
                    Launch Attack
                  </Button>
                </CardContent>
              </Card>
            ) : (
              attacks.map(battle => renderBattleCard(battle, false))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
