import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EmergencyContact } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useBuildingSettings } from '@/lib/hooks/useBuildingSettings';
import {
  Body,
  Button,
  Caption,
  Card,
  LoadingState,
  PageShell,
  TextField,
} from '@/components/ui';
import { SuccessBanner } from '@/components/WheelPickers';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function newContactId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function EmergencyContactsScreen() {
  const { isAdmin } = useBuilding();
  const { settings, isLoading, patchSettings } = useBuildingSettings();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [draft, setDraft] = useState<EmergencyContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) setContacts(settings.houseRules.emergencyContacts);
  }, [settings]);

  if (isLoading || !settings) return <LoadingState />;

  const readOnly = !isAdmin;

  async function persist(next: EmergencyContact[]) {
    setSaving(true);
    try {
      await patchSettings({ houseRules: { emergencyContacts: next } });
      setContacts(next);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  function openEditor(contact?: EmergencyContact) {
    setDraft(
      contact ?? {
        id: newContactId(),
        name: '',
        role: '',
        phone: '',
        email: '',
      },
    );
    setEditorVisible(true);
  }

  async function saveDraft() {
    if (!draft?.name.trim() || !draft.role.trim() || !draft.phone.trim()) {
      Alert.alert(t('settings.emergency.validation'));
      return;
    }
    const exists = contacts.some((c) => c.id === draft.id);
    const next = exists
      ? contacts.map((c) => (c.id === draft.id ? draft : c))
      : [...contacts, draft];
    await persist(next);
    setEditorVisible(false);
    setDraft(null);
  }

  function confirmDelete(contact: EmergencyContact) {
    Alert.alert(t('settings.emergency.deleteTitle'), contact.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.emergency.delete'),
        style: 'destructive',
        onPress: () => persist(contacts.filter((c) => c.id !== contact.id)),
      },
    ]);
  }

  const swiss = contacts.filter((c) => c.isSwissEmergency);
  const buildingContacts = contacts.filter((c) => !c.isSwissEmergency);

  return (
    <PageShell
      footer={
        readOnly ? undefined : (
          <Button
            label={t('settings.emergency.add')}
            variant="accent"
            icon="add"
            onPress={() => openEditor()}
          />
        )
      }
    >
      <SuccessBanner message={t('settings.saved')} visible={success} />

      <Text style={[styles.section, styles.sectionFirst]}>{t('settings.emergency.building')}</Text>
      {buildingContacts.map((contact) => (
        <EmergencyRow
          key={contact.id}
          contact={contact}
          readOnly={readOnly}
          onCall={() => Linking.openURL(`tel:${contact.phone}`)}
          onEdit={() => openEditor(contact)}
          onDelete={() => confirmDelete(contact)}
        />
      ))}

      {swiss.length > 0 ? (
        <>
          <Text style={styles.section}>{t('settings.emergency.swiss')}</Text>
          {swiss.map((contact) => (
            <EmergencyRow
              key={contact.id}
              contact={contact}
              readOnly={readOnly}
              onCall={() => Linking.openURL(`tel:${contact.phone}`)}
              onEdit={() => openEditor(contact)}
              onDelete={() => confirmDelete(contact)}
            />
          ))}
        </>
      ) : null}

      <EmergencyContactEditor
        visible={editorVisible}
        draft={draft}
        saving={saving}
        isEditing={!!draft && contacts.some((c) => c.id === draft.id)}
        onChange={setDraft}
        onClose={() => {
          setEditorVisible(false);
          setDraft(null);
        }}
        onSave={saveDraft}
      />
    </PageShell>
  );
}

type FieldKey = 'name' | 'role' | 'phone' | 'email';

function EmergencyContactEditor({
  visible,
  draft,
  saving,
  isEditing,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  draft: EmergencyContact | null;
  saving: boolean;
  isEditing: boolean;
  onChange: (contact: EmergencyContact | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, View | null>>>({});

  function scrollToField(key: FieldKey) {
    requestAnimationFrame(() => {
      const field = fieldRefs.current[key];
      const content = contentRef.current;
      if (!field || !content) return;

      field.measureLayout(
        content,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
        },
        () => {},
      );
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityRole="button" />
        <View style={styles.modalSheet}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View ref={contentRef}>
              <Text style={styles.modalTitle}>
                {isEditing ? t('settings.emergency.edit') : t('settings.emergency.add')}
              </Text>

              <View ref={(node) => { fieldRefs.current.name = node; }}>
                <TextField
                  label={t('settings.emergency.name')}
                  value={draft?.name ?? ''}
                  onChangeText={(v) => onChange(draft ? { ...draft, name: v } : draft)}
                  onFocus={() => scrollToField('name')}
                  returnKeyType="next"
                />
              </View>
              <View ref={(node) => { fieldRefs.current.role = node; }}>
                <TextField
                  label={t('settings.emergency.role')}
                  value={draft?.role ?? ''}
                  onChangeText={(v) => onChange(draft ? { ...draft, role: v } : draft)}
                  onFocus={() => scrollToField('role')}
                  returnKeyType="next"
                />
              </View>
              <View ref={(node) => { fieldRefs.current.phone = node; }}>
                <TextField
                  label={t('settings.emergency.phone')}
                  value={draft?.phone ?? ''}
                  onChangeText={(v) => onChange(draft ? { ...draft, phone: v } : draft)}
                  keyboardType="phone-pad"
                  onFocus={() => scrollToField('phone')}
                  returnKeyType="next"
                />
              </View>
              <View ref={(node) => { fieldRefs.current.email = node; }}>
                <TextField
                  label={t('settings.emergency.emailOptional')}
                  value={draft?.email ?? ''}
                  onChangeText={(v) => onChange(draft ? { ...draft, email: v } : draft)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => scrollToField('email')}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.modalActions}>
                <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
                <Button label={t('settings.save')} variant="accent" loading={saving} onPress={onSave} />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EmergencyRow({
  contact,
  readOnly,
  onCall,
  onEdit,
  onDelete,
}: {
  contact: EmergencyContact;
  readOnly: boolean;
  onCall: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card style={styles.rowCard}>
      <Pressable style={styles.rowMain} onPress={onCall}>
        <View style={styles.rowIcon}>
          <Ionicons name="call" size={20} color="#fff" />
        </View>
        <View style={styles.rowText}>
          <Body>{contact.name}</Body>
          <Caption>{contact.role}</Caption>
          <Text style={styles.phone}>{contact.phone}</Text>
          {contact.email ? <Caption>{contact.email}</Caption> : null}
        </View>
      </Pressable>
      {!readOnly ? (
        <View style={styles.rowActions}>
          <Pressable onPress={onEdit} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.caption, marginBottom: spacing.sm, marginTop: spacing.md, fontWeight: '600' },
  sectionFirst: { marginTop: 0 },
  rowCard: { marginBottom: spacing.sm, padding: 0, overflow: 'hidden' },
  rowMain: { flexDirection: 'row', padding: spacing.md, gap: spacing.md, alignItems: 'center' },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  phone: { ...typography.body, fontWeight: '600', color: colors.primary, marginTop: 4 },
  rowActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  iconBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.heading, textAlign: 'center', marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
