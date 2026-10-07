import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, Modal, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';

import AppTabs from '@/components/app-tabs';
import { AuthScreen } from '@/components/auth-screen';
import { UserService } from '@/services/user-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [profile, setProfile] = useState(UserService.getProfile());

  useEffect(() => {
    async function preloadAssets() {
      try {
        // Preload spot images directly into memory cache for instant rendering
        await Asset.loadAsync([
          require('../../assets/images/spots/vln-gediminas-tower.jpg'),
          require('../../assets/images/spots/vln-cathedral-square.jpg'),
          require('../../assets/images/spots/vln-gate-of-dawn.jpg'),
          require('../../assets/images/spots/vln-university.jpg'),
          require('../../assets/images/spots/trk-island-castle.jpg'),
          require('../../assets/images/spots/sia-hill-of-crosses.jpg'),
        ]);
      } catch (e) {
        // Continue even if prefetch is interrupted
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    preloadAssets();

    const unsubscribe = UserService.subscribe(() => {
      setProfile(UserService.getProfile());
    });
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.container}>
        <AppTabs />
        <Modal
          visible={!profile.isConnected}
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent>
          <AuthScreen onSuccess={() => setProfile(UserService.getProfile())} />
        </Modal>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
