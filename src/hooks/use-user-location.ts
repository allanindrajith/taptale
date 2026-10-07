import { useCallback, useEffect, useState } from 'react';

import { LocationService, LocationState } from '@/services/location-service';

/** Live user location (GPS with a Vilnius fallback) plus a manual refresh. */
export function useUserLocation() {
  const [location, setLocation] = useState<LocationState>(LocationService.getCoords());

  useEffect(() => {
    LocationService.initRealTimeLocation();
    return LocationService.subscribe(() => setLocation(LocationService.getCoords()));
  }, []);

  const refresh = useCallback(async () => {
    await LocationService.initRealTimeLocation();
    setLocation(LocationService.getCoords());
  }, []);

  return { location, refresh };
}
