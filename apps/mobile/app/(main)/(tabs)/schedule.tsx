import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { useBuilding } from '@/lib/building';
import { AdminMaintenanceCalendar } from '@/components/AdminMaintenanceCalendar';
import { ResidentCalendar } from '@/components/calendar/ResidentCalendar';
import { LoadingState } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function ScheduleScreen() {
  const { isPropertyManager, loading } = useBuilding();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: isPropertyManager ? t('maintenance.title') : t('schedule.title'),
    });
  }, [navigation, isPropertyManager]);

  if (loading) return <LoadingState />;
  if (isPropertyManager) return <AdminMaintenanceCalendar />;
  return (
    <View style={styles.root}>
      <ResidentCalendar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
