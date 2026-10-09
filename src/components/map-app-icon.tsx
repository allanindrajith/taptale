import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

interface Props {
  appId: string;
  size?: number;
}

const RADIUS_RATIO = 0.225; // iOS-style app icon corner

// Official App Store artwork, bundled so the picker needs no network.
const ICONS: Record<string, ImageSourcePropType> = {
  apple: require('../../assets/images/map-apps/apple.png'),
  google: require('../../assets/images/map-apps/google.png'),
  waze: require('../../assets/images/map-apps/waze.png'),
  uber: require('../../assets/images/map-apps/uber.png'),
  bolt: require('../../assets/images/map-apps/bolt.png'),
};

/** The app's own icon, rounded like on the home screen. */
export function MapAppIcon({ appId, size = 56 }: Props) {
  const source = ICONS[appId];
  return (
    <View style={{ width: size, height: size, borderRadius: size * RADIUS_RATIO, overflow: 'hidden' }}>
      {source ? <Image source={source} style={{ width: size, height: size }} accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}
