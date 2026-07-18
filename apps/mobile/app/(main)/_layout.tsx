import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { BuildingProvider } from '@/lib/building';
import { LoadingState } from '@/components/ui';
import { colors } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function MainLayout() {
  const { token, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!token) return <Redirect href="/" />;

  return (
    <BuildingProvider>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { minHeight: 56 },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('dashboard.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: t('schedule.today'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t('notifications.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="machine/[id]" options={{ href: null, title: 'Machine' }} />
        <Tabs.Screen name="reserve" options={{ href: null, title: 'Reserve' }} />
        <Tabs.Screen name="timer" options={{ href: null, title: 'Timer' }} />
        <Tabs.Screen name="checklist" options={{ href: null, title: 'Checklist' }} />
        <Tabs.Screen name="defect" options={{ href: null, title: 'Defect' }} />
        <Tabs.Screen name="defects" options={{ href: null, title: 'Defects' }} />
        <Tabs.Screen name="house-rules" options={{ href: null, title: 'House rules' }} />
        <Tabs.Screen name="scan" options={{ href: null, title: 'Scan' }} />
      </Tabs>
    </BuildingProvider>
  );
}
