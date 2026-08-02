import { useBuilding } from '@/lib/building';
import { Body, Caption, Card, LoadingState, PageShell, SectionLabel } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function BuildingQrCodesScreen() {
  const { building, loading } = useBuilding();

  if (loading) return <LoadingState />;

  const resources =
    building?.laundryRooms.flatMap((room) =>
      room.resources.map((r) => ({ ...r, roomName: room.name })),
    ) ?? [];

  return (
    <PageShell>
      <SectionLabel>{t('dashboard.qrCodes')}</SectionLabel>
      <Caption>{t('dashboard.qrCodesHint')}</Caption>
      {resources.map((resource) => (
        <Card key={resource.id} style={{ marginTop: 8 }}>
          <Body>{resource.name}</Body>
          <Caption>{resource.roomName}</Caption>
          <Caption>{resource.qrCodeIdentifier ?? resource.id}</Caption>
        </Card>
      ))}
      {!resources.length ? <Caption>{t('dashboard.noMachines')}</Caption> : null}
    </PageShell>
  );
}
