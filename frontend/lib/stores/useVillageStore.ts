import { create } from 'zustand';
import { villagesApi, type Village, type Building, type Resources } from '../api';

interface VillageState {
  village: Village | null;
  isLoading: boolean;
  error: string | null;
  fetchVillage: () => Promise<void>;
  updateResources: (gold: number, elixir: number) => void;
  addBuilding: (building: Building) => void;
  removeBuilding: (buildingId: string) => void;
  updateBuilding: (buildingId: string, updates: Partial<Building>) => void;
  clearError: () => void;
}

export const useVillageStore = create<VillageState>((set, get) => ({
  village: null,
  isLoading: false,
  error: null,

  fetchVillage: async () => {
    try {
      set({ isLoading: true, error: null });
      const village = await villagesApi.getMyVillage();
      set({ village, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch village',
        isLoading: false,
      });
    }
  },

  updateResources: (gold: number, elixir: number) => {
    const { village } = get();
    if (village && village.resources) {
      set({
        village: {
          ...village,
          resources: {
            ...village.resources,
            gold,
            elixir,
          },
        },
      });
    }
  },

  addBuilding: (building: Building) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: [...village.buildings, building],
        },
      });
    }
  },

  removeBuilding: (buildingId: string) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: village.buildings.filter((b) => b.id !== buildingId),
        },
      });
    }
  },

  updateBuilding: (buildingId: string, updates: Partial<Building>) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: village.buildings.map((b) => (b.id === buildingId ? { ...b, ...updates } : b)),
        },
      });
    }
  },

  clearError: () => set({ error: null }),
}));
