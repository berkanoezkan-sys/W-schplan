type SelectableBuilding = {
  id: string;
  role: 'RESIDENT' | 'ADMINISTRATOR';
};

export function resolveSelectedBuildingId(
  buildings: SelectableBuilding[],
  storedId: string | null,
): string | null {
  if (!buildings.length) return null;
  if (storedId && buildings.some((building) => building.id === storedId)) {
    return storedId;
  }
  const adminBuilding = buildings.find((building) => building.role === 'ADMINISTRATOR');
  return adminBuilding?.id ?? buildings[0].id;
}

export function adminBuildings<T extends SelectableBuilding>(buildings: T[]): T[] {
  return buildings.filter((building) => building.role === 'ADMINISTRATOR');
}
