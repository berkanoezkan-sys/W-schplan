import { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BuildingNotice } from '@/lib/hooks/useBuildingNotices';
import { NoticeCard } from './NoticeCard';
import { Button } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Props = {
  notices: BuildingNotice[];
  visible: boolean;
  onDismiss: (noticeIds: string[]) => void;
  onViewAll: () => void;
};

export function NoticePopupModal({ notices, visible, onDismiss, onViewAll }: Props) {
  const [index, setIndex] = useState(0);
  const notice = notices[index];
  const hasMultiple = notices.length > 1;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible, notices.length]);

  const handleDismiss = useCallback(() => {
    if (!notice) return;
    onDismiss([notice.id]);
    if (index < notices.length - 1) {
      setIndex((i) => i + 1);
    }
  }, [index, notice, notices.length, onDismiss]);

  const handleDismissAll = useCallback(() => {
    onDismiss(notices.map((n) => n.id));
  }, [notices, onDismiss]);

  if (!notice) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="megaphone-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{t('notices.popup.title')}</Text>
              {hasMultiple ? (
                <Text style={styles.headerSubtitle}>
                  {t('notices.popup.progress')
                    .replace('{current}', String(index + 1))
                    .replace('{total}', String(notices.length))}
                </Text>
              ) : null}
            </View>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <NoticeCard notice={notice} />
            {notice.affectsLaundry ? (
              <View style={styles.laundryHint}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.laundryHintText}>{t('notices.laundryHint')}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button label={t('notices.popup.understood')} onPress={handleDismiss} />
            {hasMultiple && index < notices.length - 1 ? (
              <Pressable onPress={handleDismissAll} style={styles.linkBtn} accessibilityRole="button">
                <Text style={styles.linkText}>{t('notices.popup.dismissAll')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onViewAll} style={styles.linkBtn} accessibilityRole="button">
              <Text style={styles.linkText}>{t('notices.popup.viewAll')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.heading, fontSize: 18 },
  headerSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  scroll: { maxHeight: 360, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  laundryHint: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#FFF8E6',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  laundryHintText: { ...typography.caption, flex: 1, color: '#7A4F00' },
  actions: { padding: spacing.md, gap: spacing.sm },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.xs, minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
