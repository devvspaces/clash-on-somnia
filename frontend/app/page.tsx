'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { battlesApi, PublicBattle } from '@/lib/api/battles';
import { useAuthStore } from '@/lib/stores';
import { formatDistanceToNow } from 'date-fns';

function StarDisplay({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= stars ? 'text-yellow-400' : 'text-gray-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function BattleCard({ battle }: { battle: PublicBattle }) {
  const router = useRouter();
  const isActive = battle.status === 'active';
  const totalTroops = battle.attackerTroops.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          ) : (
            <span className="inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {isActive ? 'LIVE NOW' : 'COMPLETED'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Battle Matchup */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-right">
          <div className="font-semibold text-lg truncate">{battle.attackerVillage.name}</div>
          <div className="text-sm text-muted-foreground">{totalTroops} troops</div>
        </div>

        <div className="mx-4 text-2xl font-bold text-muted-foreground">VS</div>

        <div className="flex-1">
          <div className="font-semibold text-lg truncate">{battle.defenderVillage.name}</div>
          <div className="text-sm text-muted-foreground">Defender</div>
        </div>
      </div>

      {/* Results */}
      {!isActive && (
        <div className="border-t border-border pt-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Stars</div>
                <StarDisplay stars={battle.stars} />
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Destruction</div>
                <div className="font-semibold">{battle.destructionPercentage}%</div>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Loot</div>
                <div className="flex gap-2 text-sm">
                  <span className="text-yellow-500">🪙 {battle.lootGold.toLocaleString()}</span>
                  <span className="text-purple-500">💜 {battle.lootElixir.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => router.push(`/battle/${battle.id}/spectate`)}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          isActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        }`}
      >
        {isActive ? '👁 Watch Live' : '📺 View Replay'}
      </button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [battles, setBattles] = useState<PublicBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'completed'>('all');

  useEffect(() => {
    loadBattles();
    const interval = setInterval(loadBattles, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadBattles = async () => {
    try {
      const data = await battlesApi.getRecentBattles(50);
      setBattles(data.battles);
    } catch (error) {
      console.error('Failed to load battles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBattles = battles.filter((battle) => {
    if (filter === 'live') return battle.status === 'active';
    if (filter === 'completed') return battle.status === 'completed';
    return true;
  });

  const liveBattles = battles.filter((b) => b.status === 'active');
  const completedBattles = battles.filter((b) => b.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Clash on Somnia
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Live Battle Spectator · Powered by Somnia Blockchain
              </p>
            </div>
            <div className="flex gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => router.push('/village')}
                    className="px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                  >
                    My Village
                  </button>
                  <button
                    onClick={() => router.push('/attack')}
                    className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                  >
                    Start Battle
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-card/30 border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{battles.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Battles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                {liveBattles.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Live Now</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{completedBattles.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-card/80 text-muted-foreground'
            }`}
          >
            All Battles ({battles.length})
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'live'
                ? 'bg-red-600 text-white'
                : 'bg-card hover:bg-card/80 text-muted-foreground'
            }`}
          >
            🔴 Live ({liveBattles.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-card/80 text-muted-foreground'
            }`}
          >
            Completed ({completedBattles.length})
          </button>
        </div>
      </div>

      {/* Battles Grid */}
      <div className="container mx-auto px-4 pb-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading battles...</p>
          </div>
        ) : filteredBattles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-2xl font-semibold mb-2">No battles found</h2>
            <p className="text-muted-foreground mb-6">
              {filter === 'live'
                ? 'No live battles at the moment. Check back soon!'
                : 'Be the first to start a battle!'}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => router.push('/attack')}
                className="px-6 py-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
              >
                Start Your First Battle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
