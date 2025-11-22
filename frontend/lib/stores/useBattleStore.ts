import { create } from 'zustand';
import { BattleSession } from '@/lib/api/battles';

interface BattleState {
  battleSession: BattleSession | null;
  selectedTroops: { type: string; count: number }[];
  setBattleSession: (session: BattleSession | null) => void;
  setSelectedTroops: (troops: { type: string; count: number }[]) => void;
  clearBattle: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  battleSession: null,
  selectedTroops: [],
  setBattleSession: (session) => set({ battleSession: session }),
  setSelectedTroops: (troops) => set({ selectedTroops: troops }),
  clearBattle: () => set({ battleSession: null, selectedTroops: [] }),
}));
