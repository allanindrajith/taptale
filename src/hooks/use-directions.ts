import { useCallback, useState } from 'react';

import { Spot } from '@/constants/spots';
import {
  getInstalledMapApps,
  MapApp,
  openInMapApp,
  openSystemDirections,
} from '@/services/directions';

interface Picker {
  spot: Spot;
  apps: MapApp[];
}

/**
 * Directions flow: one installed app opens straight away, several show a picker,
 * none falls back to the system handler. Render <DirectionsSheet> with `sheet`.
 */
export function useDirections() {
  const [picker, setPicker] = useState<Picker | null>(null);

  const startDirections = useCallback(async (spot: Spot) => {
    const apps = await getInstalledMapApps();
    if (apps.length === 0) {
      await openSystemDirections(spot);
    } else if (apps.length === 1) {
      await openInMapApp(apps[0], spot);
    } else {
      setPicker({ spot, apps });
    }
  }, []);

  const choose = useCallback(
    (app: MapApp) => {
      if (!picker) return;
      setPicker(null);
      openInMapApp(app, picker.spot);
    },
    [picker]
  );

  const close = useCallback(() => setPicker(null), []);

  return { startDirections, sheet: { picker, onChoose: choose, onClose: close } };
}
