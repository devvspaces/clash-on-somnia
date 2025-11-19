import { apiClient } from './client';

export interface Building {
  id: string;
  villageId: string;
  type: string;
  level: number;
  positionX: number;
  positionY: number;
  health: number;
  maxHealth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resources {
  id: string;
  villageId: string;
  gold: number;
  elixir: number;
  lastCollectedAt: string;
  updatedAt: string;
}

export interface Village {
  id: string;
  userId: string;
  name: string;
  trophies: number;
  createdAt: string;
  updatedAt: string;
  resources: Resources;
  buildings: Building[];
}

export const villagesApi = {
  getMyVillage: async (): Promise<Village> => {
    const response = await apiClient.get<Village>('/villages/me');
    return response.data;
  },
};
