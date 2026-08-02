import { Tabs } from 'expo-router';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/lib/theme';
import { t } from '@/lib/i18n';
import { useLocale } from '@/lib/locale';

export default function TabsLayout() {
  const { locale } = useLocale();
  return (
    <Tabs
      key={locale}
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        headerShown: true,
        header: ({ options }) => (
          <AppHeader
            title={typeof options.title === 'string' ? options.title : route.name}
            options={options}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          minHeight: 56,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      })}
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
    </Tabs>
  );
}
