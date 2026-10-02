import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { AnimationType } from '@/constants/spots';

interface Props {
  animation: AnimationType;
  color: string;
  size?: number;
}

export function LocationAnimation({ animation, color, size = 180 }: Props) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    // Rotation for orbit
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse / Scale for pulse and bloom
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 900, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulsingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  switch (animation) {
    case 'pulse':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Animated.View
            style={[
              styles.pulseRing,
              { width: size * 0.9, height: size * 0.9, backgroundColor: color + '22' },
              pulsingStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              { width: size * 0.65, height: size * 0.65, backgroundColor: color + '44' },
              pulsingStyle,
            ]}
          />
          <View
            style={[
              styles.circleCenter,
              { width: size * 0.4, height: size * 0.4, backgroundColor: color },
            ]}
          />
        </View>
      );

    case 'orbit':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <View
            style={[
              styles.orbitTrack,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderColor: color + '44',
              },
            ]}
          />
          <View
            style={[
              styles.circleCenter,
              { width: size * 0.32, height: size * 0.32, backgroundColor: color + '55' },
            ]}
          />
          <Animated.View style={[styles.orbitArm, { width: size * 0.8, height: size * 0.8 }, rotatingStyle]}>
            <View
              style={[
                styles.satellite,
                { width: size * 0.16, height: size * 0.16, backgroundColor: color },
              ]}
            />
          </Animated.View>
        </View>
      );

    case 'wave':
      return (
        <View style={[styles.waveContainer, { width: size, height: size }]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <WaveBar key={i} color={color} index={i} maxHeight={size * 0.6} />
          ))}
        </View>
      );

    case 'bloom':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Animated.View style={[styles.bloomContainer, pulsingStyle]}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <View
                key={deg}
                style={[
                  styles.petal,
                  {
                    backgroundColor: color + '99',
                    transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.22 }],
                    width: size * 0.18,
                    height: size * 0.35,
                  },
                ]}
              />
            ))}
            <View
              style={[
                styles.circleCenter,
                { width: size * 0.25, height: size * 0.25, backgroundColor: color },
              ]}
            />
          </Animated.View>
        </View>
      );

    case 'confetti':
    default:
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Animated.View style={pulsingStyle}>
            {[
              { x: -35, y: -40, c: '#E67E22', s: 12 },
              { x: 30, y: -35, c: '#2980B9', s: 14 },
              { x: -45, y: 15, c: '#27AE60', s: 10 },
              { x: 40, y: 25, c: '#8E44AD', s: 16 },
              { x: 0, y: -50, c: '#F1C40F', s: 12 },
              { x: -20, y: 45, c: '#E74C3C', s: 14 },
              { x: 25, y: 50, c: color, s: 18 },
            ].map((p, i) => (
              <View
                key={i}
                style={[
                  styles.confettiPiece,
                  {
                    width: p.s,
                    height: p.s,
                    backgroundColor: p.c,
                    transform: [{ translateX: p.x }, { translateY: p.y }],
                  },
                ]}
              />
            ))}
            <View
              style={[
                styles.circleCenter,
                { width: size * 0.35, height: size * 0.35, backgroundColor: color },
              ]}
            />
          </Animated.View>
        </View>
      );
  }
}

function WaveBar({
  color,
  index,
  maxHeight,
}: {
  color: string;
  index: number;
  maxHeight: number;
}) {
  const heightAnim = useSharedValue(maxHeight * 0.3);

  useEffect(() => {
    heightAnim.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(maxHeight, { duration: 400 }),
          withTiming(maxHeight * 0.25, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    height: heightAnim.value,
  }));

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { backgroundColor: color, width: 14, borderRadius: 7 },
        barStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleCenter: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  orbitTrack: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  orbitArm: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  satellite: {
    borderRadius: 999,
    marginTop: -8,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waveBar: {
    marginHorizontal: 3,
  },
  bloomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    position: 'absolute',
    borderRadius: 40,
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 999,
  },
});
