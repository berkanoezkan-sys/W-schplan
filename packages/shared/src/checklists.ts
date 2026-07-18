export type ChecklistItem = {
  id: string;
  labelKey: string;
  mandatory: boolean;
};

export const WASHING_MACHINE_CHECKLIST: ChecklistItem[] = [
  { id: 'door_seal', labelKey: 'checklist.wash.doorSeal', mandatory: true },
  { id: 'detergent_drawer', labelKey: 'checklist.wash.detergentDrawer', mandatory: true },
  { id: 'door_open', labelKey: 'checklist.wash.doorOpen', mandatory: true },
  { id: 'drum', labelKey: 'checklist.wash.drum', mandatory: true },
  { id: 'surrounding_area', labelKey: 'checklist.wash.surroundingArea', mandatory: true },
];

export const WASHING_MACHINE_MAINTENANCE: ChecklistItem[] = [
  { id: 'drain_filter', labelKey: 'checklist.wash.maintenance.drainFilter', mandatory: false },
  { id: 'hot_cycle', labelKey: 'checklist.wash.maintenance.hotCycle', mandatory: false },
  { id: 'drawer_clean', labelKey: 'checklist.wash.maintenance.drawerClean', mandatory: false },
];

export const TUMBLE_DRYER_CHECKLIST: ChecklistItem[] = [
  { id: 'lint_filter', labelKey: 'checklist.dryer.lintFilter', mandatory: true },
  { id: 'filter_compartment', labelKey: 'checklist.dryer.filterCompartment', mandatory: true },
  { id: 'water_container', labelKey: 'checklist.dryer.waterContainer', mandatory: true },
  { id: 'drum', labelKey: 'checklist.dryer.drum', mandatory: true },
  { id: 'door_seal', labelKey: 'checklist.dryer.doorSeal', mandatory: true },
  { id: 'door_open', labelKey: 'checklist.dryer.doorOpen', mandatory: true },
  { id: 'surrounding_area', labelKey: 'checklist.dryer.surroundingArea', mandatory: true },
];

export const TUMBLE_DRYER_MAINTENANCE: ChecklistItem[] = [
  { id: 'condenser', labelKey: 'checklist.dryer.maintenance.condenser', mandatory: false },
  { id: 'lower_filter', labelKey: 'checklist.dryer.maintenance.lowerFilter', mandatory: false },
  { id: 'ventilation', labelKey: 'checklist.dryer.maintenance.ventilation', mandatory: false },
  { id: 'moisture_sensors', labelKey: 'checklist.dryer.maintenance.moistureSensors', mandatory: false },
  { id: 'exhaust_duct', labelKey: 'checklist.dryer.maintenance.exhaustDuct', mandatory: false },
];

export function getChecklistForMachineType(machineType: 'WASHING_MACHINE' | 'TUMBLE_DRYER') {
  return machineType === 'WASHING_MACHINE'
    ? { items: WASHING_MACHINE_CHECKLIST, maintenance: WASHING_MACHINE_MAINTENANCE }
    : { items: TUMBLE_DRYER_CHECKLIST, maintenance: TUMBLE_DRYER_MAINTENANCE };
}
