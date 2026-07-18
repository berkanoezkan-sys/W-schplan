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
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            minHeight: 56,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
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
            title: t('schedule.title'),
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
        <Tabs.Screen name="machine/[id]" options={{ href: null, title: t('machine.title') }} />
        <Tabs.Screen name="reserve" options={{ href: null, title: t('reserve.title') }} />
        <Tabs.Screen name="timer" options={{ href: null, title: t('timer.title') }} />
        <Tabs.Screen name="checklist" options={{ href: null, title: t('checklist.title') }} />
        <Tabs.Screen name="defect" options={{ href: null, title: t('defect.title') }} />
        <Tabs.Screen name="defects" options={{ href: null, title: t('defect.listTitle') }} />
        <Tabs.Screen name="house-rules" options={{ href: null, title: t('houseRules.title') }} />
        <Tabs.Screen name="scan" options={{ href: null, title: t('scan.title') }} />
      </Tabs>
    </BuildingProvider>
  );
}
