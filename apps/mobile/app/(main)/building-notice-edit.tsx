import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  isTemplateFieldValue,
  resolveNoticeTemplateFields,
  type NoticeAttachment,
  type NoticeCategory,
  type NoticeSeverity,
} from '@woeschplan/shared';
import { ApiError } from '@/lib/api';
import { useBuilding } from '@/lib/building';
import {
  useBuildingNotices,
  useNoticeMutations,
  type BuildingNotice,
} from '@/lib/hooks/useBuildingNotices';
import { Button, Card, LoadingState, PageShell, SectionLabel, TextField } from '@/components/ui';
import { IosWheelDateTimePicker } from '@/components/settings';
import { NoticeAttachmentSection } from '@/components/notices/NoticeAttachmentSection';
import { NoticeCategoryChips, NoticeSeverityChips } from '@/components/notices/NoticeFormParts';
import { NoticePreviewCard } from '@/components/notices/NoticePreviewCard';
import {
  SavedIndicator,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

type FormState = {
  category: NoticeCategory;
  title: string;
  body: string;
  icon: string;
  severity: NoticeSeverity;
  attachments: NoticeAttachment[];
  linkUrl: string;
  visibleFrom: Date;
  visibleUntil: Date;
  affectsLaundry: boolean;
  showOnLogin: boolean;
  sendPushNotification: boolean;
};

function defaultSchedule(): { visibleFrom: Date; visibleUntil: Date } {
  const visibleFrom = new Date();
  visibleFrom.setSeconds(0, 0);
  const visibleUntil = new Date(visibleFrom.getTime() + 24 * 60 * 60 * 1000);
  return { visibleFrom, visibleUntil };
}

function defaultForm(): FormState {
  const { visibleFrom, visibleUntil } = defaultSchedule();
  const template = resolveNoticeTemplateFields('GENERAL_INFO', t);
  return {
    category: 'GENERAL_INFO',
    title: template.title,
    body: template.body,
    icon: template.icon,
    severity: template.severity,
    attachments: [],
    linkUrl: '',
    visibleFrom,
    visibleUntil,
    affectsLaundry: template.affectsLaundry,
    showOnLogin: true,
    sendPushNotification: false,
  };
}

function noticeToForm(notice: BuildingNotice): FormState {
  return {
    category: notice.category,
    title: notice.title,
    body: notice.body,
    icon: notice.icon,
    severity: notice.severity,
    attachments: notice.attachments ?? [],
    linkUrl: '',
    visibleFrom: new Date(notice.startTime),
    visibleUntil: new Date(notice.endTime),
    affectsLaundry: notice.affectsLaundry,
    showOnLogin: notice.showOnLogin,
    sendPushNotification: notice.sendPushNotification ?? false,
  };
}

export default function BuildingNoticeEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin, building } = useBuilding();
  const { data, isLoading } = useBuildingNotices(true);
  const { create, update } = useNoticeMutations();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [baseline, setBaseline] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  const existing = useMemo(
    () => (id ? data?.notices.find((n) => n.id === id) : undefined),
    [data?.notices, id],
  );

  useEffect(() => {
    if (existing) {
      const next = noticeToForm(existing);
      setForm(next);
      setBaseline(next);
    } else if (!id) {
      const next = defaultForm();
      setForm(next);
      setBaseline(next);
    }
  }, [existing, id]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const selectCategory = useCallback((category: NoticeCategory) => {
    setForm((prev) => {
      if (prev.category === category) return prev;
      const template = resolveNoticeTemplateFields(category, t);
      const titleMatchesTemplate = isTemplateFieldValue(prev.category, 'title', prev.title, t);
      const bodyMatchesTemplate = isTemplateFieldValue(prev.category, 'body', prev.body, t);

      return {
        ...prev,
        category,
        icon: template.icon,
        title: titleMatchesTemplate ? template.title : prev.title,
        body: bodyMatchesTemplate ? template.body : prev.body,
        severity: template.severity,
        affectsLaundry: template.affectsLaundry,
      };
    });
  }, []);

  const addLinkAttachment = useCallback(() => {
    const url = form.linkUrl.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      Alert.alert(t('notices.attachments.invalidUrl'));
      return;
    }
    const link: NoticeAttachment = {
      id: `link-${Date.now()}`,
      kind: 'link',
      name: url.replace(/^https?:\/\//, '').slice(0, 60),
      url,
    };
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments.filter((a) => a.url !== url), link],
      linkUrl: '',
    }));
  }, [form.linkUrl]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert(t('notices.validation.required'));
      return;
    }
    if (form.visibleUntil <= form.visibleFrom) {
      Alert.alert(t('notices.validation.dates'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        severity: form.severity,
        icon: form.icon,
        attachments: form.attachments,
        attachmentUrl: form.attachments.find((a) => a.kind === 'link')?.url ?? null,
        startTime: form.visibleFrom.toISOString(),
        endTime: form.visibleUntil.toISOString(),
        affectsLaundry: form.affectsLaundry,
        showOnLogin: form.showOnLogin,
        sendPushNotification: form.sendPushNotification,
      };

      if (id) {
        await update.mutateAsync({ noticeId: id, input: payload });
      } else {
        await create.mutateAsync(payload);
      }

      setBaseline({ ...form });
      await triggerSaveHaptic();
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1800);
      router.back();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('notices.saveError');
      Alert.alert(t('notices.saveError'), message);
    } finally {
      setSaving(false);
    }
  }, [create, form, id, update]);

  const handleCancel = useCallback(() => {
    setForm({ ...baseline });
  }, [baseline]);

  useEditableHeader({ isDirty, isSaving: saving, onSave: handleSave, onCancel: handleCancel });

  if (!isAdmin) {
    return (
      <PageShell>
        <Text>{t('notices.adminOnly')}</Text>
      </PageShell>
    );
  }

  if (isLoading && id) return <LoadingState />;

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />
      <Text style={styles.intro}>{t('notices.editHint')}</Text>
      {building ? (
        <Text style={styles.buildingScope}>
          {t('notices.buildingScope').replace('{building}', building.name)}
        </Text>
      ) : null}

      <Card>
        <SectionLabel>{t('notices.field.category')}</SectionLabel>
        <NoticeCategoryChips value={form.category} onChange={selectCategory} />

        <TextField
          label={t('notices.field.title')}
          value={form.title}
          onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
        />
        <TextField
          label={t('notices.field.body')}
          value={form.body}
          onChangeText={(v) => setForm((p) => ({ ...p, body: v }))}
          multiline
          numberOfLines={4}
        />

        <SectionLabel>{t('notices.field.severity')}</SectionLabel>
        <NoticeSeverityChips
          value={form.severity}
          onChange={(severity) => setForm((p) => ({ ...p, severity }))}
        />
      </Card>

      <Card>
        <NoticeAttachmentSection
          attachments={form.attachments}
          linkUrl={form.linkUrl}
          onChangeAttachments={(attachments) => setForm((p) => ({ ...p, attachments }))}
          onChangeLinkUrl={(linkUrl) => setForm((p) => ({ ...p, linkUrl }))}
          onAddLink={addLinkAttachment}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('notices.field.visibility')}</Text>
        <Text style={styles.pickerLabel}>{t('notices.field.visibleFrom')}</Text>
        {Platform.OS === 'web' ? (
          <TextField
            value={form.visibleFrom.toISOString()}
            onChangeText={(v) => {
              const d = new Date(v);
              if (!Number.isNaN(d.getTime())) setForm((p) => ({ ...p, visibleFrom: d }));
            }}
          />
        ) : (
          <IosWheelDateTimePicker
            value={form.visibleFrom}
            mode="datetime"
            onChange={(_, date) => date && setForm((p) => ({ ...p, visibleFrom: date }))}
          />
        )}
        <Text style={styles.pickerLabel}>{t('notices.field.visibleUntil')}</Text>
        {Platform.OS === 'web' ? (
          <TextField
            value={form.visibleUntil.toISOString()}
            onChangeText={(v) => {
              const d = new Date(v);
              if (!Number.isNaN(d.getTime())) setForm((p) => ({ ...p, visibleUntil: d }));
            }}
          />
        ) : (
          <IosWheelDateTimePicker
            value={form.visibleUntil}
            mode="datetime"
            onChange={(_, date) => date && setForm((p) => ({ ...p, visibleUntil: date }))}
          />
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('notices.field.delivery')}</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('notices.field.showOnLogin')}</Text>
            <Text style={styles.toggleHint}>{t('notices.field.showOnLoginHint')}</Text>
          </View>
          <Switch
            value={form.showOnLogin}
            onValueChange={(v) => setForm((p) => ({ ...p, showOnLogin: v }))}
            trackColor={{ true: colors.accent }}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('notices.field.sendPush')}</Text>
            <Text style={styles.toggleHint}>{t('notices.field.sendPushHint')}</Text>
          </View>
          <Switch
            value={form.sendPushNotification}
            onValueChange={(v) => setForm((p) => ({ ...p, sendPushNotification: v }))}
            trackColor={{ true: colors.accent }}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('notices.field.affectsLaundry')}</Text>
            <Text style={styles.toggleHint}>{t('notices.field.affectsLaundryHint')}</Text>
          </View>
          <Switch
            value={form.affectsLaundry}
            onValueChange={(v) => setForm((p) => ({ ...p, affectsLaundry: v }))}
            trackColor={{ true: colors.accent }}
          />
        </View>
      </Card>

      <NoticePreviewCard
        title={form.title}
        body={form.body}
        category={form.category}
        severity={form.severity}
        icon={form.icon}
        attachments={form.attachments}
        visibleFrom={form.visibleFrom}
        visibleUntil={form.visibleUntil}
        affectsLaundry={form.affectsLaundry}
      />

      <Button label={t('common.save')} onPress={handleSave} loading={saving} />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  buildingScope: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  sectionTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.sm },
  pickerLabel: { ...typography.caption, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  toggleText: { flex: 1 },
  toggleLabel: { ...typography.body, fontWeight: '500' },
  toggleHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
