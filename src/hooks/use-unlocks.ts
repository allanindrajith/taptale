import { useEffect, useState } from 'react';

import { SPOTS } from '@/constants/spots';
import { UnlockService } from '@/services/unlock-storage';

/**
 * Re-renders the caller whenever a pass is unlocked, renewed or reset,
 * and returns how many places are currently unlocked.
 */
export function useUnlocks() {
  const [version, setVersion] = useState(0);

  useEffect(() => UnlockService.subscribe(() => setVersion((v) => v + 1)), []);

  const unlockedCount = SPOTS.filter((s) => UnlockService.isUnlocked(s.id)).length;
  return { unlockedCount, total: SPOTS.length, version };
}
