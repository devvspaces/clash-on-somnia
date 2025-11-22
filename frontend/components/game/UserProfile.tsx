'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trophy, Swords, Target, Star, Calendar, Edit2, Check, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useToastStore } from '@/lib/stores/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, updateUsername } = useAuthStore();
  const { success, error: showError } = useToastStore();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Mock stats - replace with real data later
  const stats = {
    level: 12,
    xp: 3450,
    xpToNextLevel: 5000,
    totalBattles: 87,
    wins: 62,
    losses: 25,
    winRate: 71,
    trophies: 1850,
    highestTrophies: 2100,
    goldLooted: 125000,
    elixirLooted: 98000,
    joinedDate: 'Nov 15, 2024',
  };

  const achievements = [
    { id: 1, name: 'First Victory', icon: Trophy, tier: 'gold', unlocked: true },
    { id: 2, name: 'Veteran Warrior', icon: Swords, tier: 'silver', unlocked: true },
    { id: 3, name: 'Sharpshooter', icon: Target, tier: 'bronze', unlocked: true },
    { id: 4, name: 'Legendary', icon: Star, tier: 'gold', unlocked: false },
  ];

  const handleUpdateUsername = async () => {
    if (!newUsername || newUsername === user?.username) {
      setIsEditingUsername(false);
      return;
    }

    if (newUsername.length < 3) {
      showError('Invalid Username', 'Username must be at least 3 characters');
      return;
    }

    try {
      setIsUpdating(true);
      await updateUsername(newUsername);
      success('Username Updated!', `Your username has been changed to ${newUsername}`);
      setIsEditingUsername(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update username';
      showError('Update Failed', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[101] overflow-y-auto"
          >
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ x: Math.random() * 400, y: Math.random() * 800 }}
                  animate={{
                    y: [null, Math.random() * 800],
                    x: [null, Math.random() * 400],
                  }}
                  transition={{
                    duration: 10 + Math.random() * 10,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                >
                  <Sparkles className="text-amber-500/10" size={Math.random() * 20 + 10} />
                </motion.div>
              ))}
            </div>

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2
                  className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  PROFILE
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>

              {/* User Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 p-6 mb-6"
              >
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
                </div>

                <div className="relative">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      {/* Username */}
                      {isEditingUsername ? (
                        <div className="flex gap-2">
                          <Input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="h-9 bg-white/10 border-white/20 text-white"
                            disabled={isUpdating}
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateUsername}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">
                            {user?.username || 'Player'}
                          </h3>
                          <button
                            onClick={() => {
                              setNewUsername(user?.username || '');
                              setIsEditingUsername(true);
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400 hover:text-amber-400" />
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  {/* Level & XP */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-amber-400">LEVEL {stats.level}</span>
                      <span className="text-xs text-gray-400">
                        {stats.xp.toLocaleString()} / {stats.xpToNextLevel.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.xp / stats.xpToNextLevel) * 100}%` }}
                        transition={{ duration: 1.5, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-3 mb-6"
              >
                {[
                  { label: 'Battles', value: stats.totalBattles, icon: Swords, color: 'from-blue-500 to-cyan-500' },
                  { label: 'Wins', value: stats.wins, icon: Trophy, color: 'from-green-500 to-emerald-500' },
                  { label: 'Win Rate', value: `${stats.winRate}%`, icon: Target, color: 'from-purple-500 to-pink-500' },
                  { label: 'Trophies', value: stats.trophies, icon: Star, color: 'from-amber-500 to-orange-500' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 p-4"
                  >
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`} />
                    <stat.icon className={`w-5 h-5 mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-400 uppercase" style={{ letterSpacing: '0.05em' }}>
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <h3
                  className="text-lg font-bold text-white mb-3"
                  style={{ letterSpacing: '0.05em' }}
                >
                  ACHIEVEMENTS
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((achievement, i) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className={`
                        relative overflow-hidden rounded-xl p-4 border
                        ${achievement.unlocked
                          ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20'
                          : 'bg-black/20 border-white/5 opacity-50'
                        }
                      `}
                    >
                      <achievement.icon
                        className={`w-6 h-6 mb-2 ${
                          achievement.unlocked
                            ? achievement.tier === 'gold'
                              ? 'text-amber-400'
                              : achievement.tier === 'silver'
                              ? 'text-gray-300'
                              : 'text-orange-600'
                            : 'text-gray-600'
                        }`}
                      />
                      <div className="text-xs font-bold text-white mb-1">
                        {achievement.name}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase">
                        {achievement.tier}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Account Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {stats.joinedDate}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
