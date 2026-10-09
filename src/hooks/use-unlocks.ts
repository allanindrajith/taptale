import { useEffect, useState } from 'react';

import { SPOTS } from '@/constants/spots';
import { UnlockService } from '@/services/unlock-storage';

export interface PassStatus {
  isUnlocked: boolean;
  daysLeft: number;
}

// UnlockService reads are module state, so React Compiler would cache them forever.
// Taking `version` as an input makes every read recompute after an unlock/renew/reset.
function countUnlocked(version: number): number {
  void version;
  return SPOTS.filter((s) => UnlockService.isUnlocked(s.id)).length;
}

function readPass(spotId: string | undefined, version: number): PassStatus {
  void version;
  if (!spotId) return { isUnlocked: false, daysLeft: 0 };
  return {
    isUnlocked: UnlockService.isUnlocked(spotId),
    daysLeft: UnlockService.getDaysRemaining(spotId),
  };
}

/**
 * Re-renders the caller whenever a pass is unlocked, renewed or reset,
 * and returns how many places are currently unlocked.
 */
export function useUnlocks() {
  const [version, setVersion] = useState(0);

  useEffect(() => UnlockService.subscribe(() => setVersion((v) => v + 1)), []);

  return { unlockedCount: countUnlocked(version), total: SPOTS.length, version };
}

/** Live pass status for one spot; updates the moment a scan unlocks it. */
export function usePass(spotId: string | undefined): PassStatus {
  const { version } = useUnlocks();
  return readPass(spotId, version);
}
