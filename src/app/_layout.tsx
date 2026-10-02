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
          require('../../assets/images/gediminas_tower.jpg'),
          require('../../assets/images/cathedral_square.jpg'),
          require('../../assets/images/gate_of_dawn.jpg'),
          require('../../assets/images/vilnius_university.jpg'),
          require('../../assets/images/uzupis.jpg'),
          require('../../assets/images/trakai_castle.jpg'),
          require('../../assets/images/hill_of_crosses.jpg'),
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
