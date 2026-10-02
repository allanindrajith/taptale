import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, Modal, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { AuthScreen } from '@/components/auth-screen';
import { UserService } from '@/services/user-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [profile, setProfile] = useState(UserService.getProfile());

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
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
