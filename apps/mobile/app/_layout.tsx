import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/locale';
import { LoadingState } from '@/components/ui';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const tree = !fontsLoaded ? (
    <LoadingState />
  ) : (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );

  return <View style={styles.root}>{tree}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: { minHeight: '100vh' as const },
      default: {},
    }),
  },
});
