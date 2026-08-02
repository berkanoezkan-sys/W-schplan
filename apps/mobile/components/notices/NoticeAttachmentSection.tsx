import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NoticeAttachment } from '@woeschplan/shared';
import { Button, SectionLabel, TextField } from '@/components/ui';
import { apiUpload, resolveApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function attachmentIcon(mimeType?: string): keyof typeof Ionicons.glyphMap {
  if (!mimeType) return 'document-outline';
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  return 'document-outline';
}

export function NoticeAttachmentSection({
  attachments,
  linkUrl,
  onChangeAttachments,
  onChangeLinkUrl,
  onAddLink,
}: {
  attachments: NoticeAttachment[];
  linkUrl: string;
  onChangeAttachments: (next: NoticeAttachment[]) => void;
  onChangeLinkUrl: (url: string) => void;
  onAddLink: () => void;
}) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  async function pickFile() {
    if (!buildingId || !token) return;
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);

    try {
      const uploaded = await apiUpload<NoticeAttachment>(
        `/buildings/${buildingId}/notices/attachments`,
        formData,
        token,
      );
      onChangeAttachments([...attachments, uploaded]);
    } catch {
      Alert.alert(t('notices.attachments.uploadError'));
    }
  }

  function removeAttachment(id: string) {
    onChangeAttachments(attachments.filter((a) => a.id !== id));
  }

  return (
    <View>
      <SectionLabel>{t('notices.field.attachments')}</SectionLabel>
      <Text style={styles.hint}>{t('notices.field.attachmentsHint')}</Text>

      {attachments.map((item) => (
        <Pressable
          key={item.id}
          style={styles.attachmentRow}
          onPress={() => Linking.openURL(resolveApiUrl(item.url))}
          accessibilityRole="button"
        >
          <Ionicons name={attachmentIcon(item.mimeType)} size={18} color={colors.primary} />
          <View style={styles.attachmentBody}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.attachmentKind}>
              {item.kind === 'link' ? t('notices.attachments.link') : t('notices.attachments.file')}
            </Text>
          </View>
          <Pressable
            onPress={() => removeAttachment(item.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('notices.attachments.remove')}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}

      <View style={styles.actions}>
        <Button label={t('notices.attachments.addFile')} onPress={() => void pickFile()} variant="secondary" icon="attach-outline" />
      </View>

      <TextField
        label={t('notices.field.linkUrl')}
        value={linkUrl}
        onChangeText={onChangeLinkUrl}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://"
      />
      <Pressable style={styles.addLinkBtn} onPress={onAddLink} accessibilityRole="button">
        <Text style={styles.addLinkText}>{t('notices.attachments.addLink')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  attachmentBody: { flex: 1 },
  attachmentName: { ...typography.body, fontWeight: '600', fontSize: 14 },
  attachmentKind: { ...typography.caption, color: colors.textMuted },
  actions: { marginBottom: spacing.md },
  addLinkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  addLinkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
