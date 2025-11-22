'use client';

import { Button } from '@/components/ui/button';
import { Building2, Users, Swords, History } from 'lucide-react';

interface FloatingActionButtonsProps {
  onBuild: () => void;
  onTrainArmy: () => void;
  onAttack: () => void;
  onWarRoom: () => void;
  disabled?: boolean;
}

export function FloatingActionButtons({
  onBuild,
  onTrainArmy,
  onAttack,
  onWarRoom,
  disabled = false,
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex flex-col gap-3">
        {/* Build Button */}
        <Button
          onClick={onBuild}
          disabled={disabled}
          className="h-14 w-14 rounded-full bg-blue-600 p-0 shadow-xl hover:bg-blue-700 disabled:opacity-50"
          title="Build"
        >
          <Building2 className="h-6 w-6" />
        </Button>

        {/* Train Army Button */}
        <Button
          onClick={onTrainArmy}
          disabled={disabled}
          className="h-14 w-14 rounded-full bg-green-600 p-0 shadow-xl hover:bg-green-700 disabled:opacity-50"
          title="Train Army"
        >
          <Users className="h-6 w-6" />
        </Button>

        {/* Attack Button */}
        <Button
          onClick={onAttack}
          disabled={disabled}
          className="h-14 w-14 rounded-full bg-red-600 p-0 shadow-xl hover:bg-red-700 disabled:opacity-50"
          title="Attack"
        >
          <Swords className="h-6 w-6" />
        </Button>

        {/* War Room Button */}
        <Button
          onClick={onWarRoom}
          disabled={disabled}
          className="h-14 w-14 rounded-full bg-purple-600 p-0 shadow-xl hover:bg-purple-700 disabled:opacity-50"
          title="War Room"
        >
          <History className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
