'use client';

import { Coins, Droplet, Users } from 'lucide-react';
import { ResourcesWithPending } from '@/lib/api';

interface FloatingResourceBarProps {
  villageName: string;
  resources: ResourcesWithPending | null;
  isLoading: boolean;
}

export function FloatingResourceBar({ villageName, resources, isLoading }: FloatingResourceBarProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-lg bg-gray-900/90 px-6 py-3 shadow-2xl backdrop-blur-sm">
        {/* Village Name */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
          <h1 className="text-lg font-bold text-white">{villageName}</h1>
        </div>

        {/* Resources */}
        {resources && !isLoading ? (
          <>
            {/* Gold */}
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <Coins className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Gold</span>
                <span className="font-bold text-yellow-400">
                  {formatNumber(resources.gold)}
                </span>
              </div>
              {resources.pendingGold > 0 && (
                <span className="text-xs text-green-400">
                  +{formatNumber(resources.pendingGold)}
                </span>
              )}
            </div>

            {/* Elixir */}
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-500/20 p-2">
                <Droplet className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Elixir</span>
                <span className="font-bold text-purple-400">
                  {formatNumber(resources.elixir)}
                </span>
              </div>
              {resources.pendingElixir > 0 && (
                <span className="text-xs text-green-400">
                  +{formatNumber(resources.pendingElixir)}
                </span>
              )}
            </div>

            {/* Troops (if available) */}
            {resources.troops !== undefined && (
              <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Troops</span>
                  <span className="font-bold text-blue-400">
                    {resources.troops}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
