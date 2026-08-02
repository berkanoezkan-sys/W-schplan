import { z } from 'zod';
import { NOTICE_CATEGORIES, SEVERITIES, type NoticeCategory } from './constants.js';

export type { NoticeCategory };
export type NoticeSeverity = (typeof SEVERITIES)[number];

/** Registry entry for each notice category. Add a category here + enum + i18n keys — UI picks it up automatically. */
export type NoticeTemplateDefinition = {
  icon: string;
  titleKey: string;
  bodyKey: string;
  defaultAffectsLaundry?: boolean;
  defaultSeverity?: NoticeSeverity;
};

export const NOTICE_TEMPLATES: Record<NoticeCategory, NoticeTemplateDefinition> = {
  MAINTENANCE: {
    icon: 'construct-outline',
    titleKey: 'notices.template.MAINTENANCE.title',
    bodyKey: 'notices.template.MAINTENANCE.body',
  },
  WATER_SHUTOFF: {
    icon: 'water-outline',
    titleKey: 'notices.template.WATER_SHUTOFF.title',
    bodyKey: 'notices.template.WATER_SHUTOFF.body',
    defaultAffectsLaundry: true,
    defaultSeverity: 'HIGH',
  },
  CONSTRUCTION: {
    icon: 'hammer-outline',
    titleKey: 'notices.template.CONSTRUCTION.title',
    bodyKey: 'notices.template.CONSTRUCTION.body',
    defaultSeverity: 'MEDIUM',
  },
  GENERAL_INFO: {
    icon: 'information-circle-outline',
    titleKey: 'notices.template.GENERAL_INFO.title',
    bodyKey: 'notices.template.GENERAL_INFO.body',
  },
  ELEVATOR: {
    icon: 'swap-vertical-outline',
    titleKey: 'notices.template.ELEVATOR.title',
    bodyKey: 'notices.template.ELEVATOR.body',
    defaultSeverity: 'HIGH',
  },
  HEATING: {
    icon: 'flame-outline',
    titleKey: 'notices.template.HEATING.title',
    bodyKey: 'notices.template.HEATING.body',
    defaultSeverity: 'MEDIUM',
  },
};

/** @deprecated Use NOTICE_TEMPLATES[category].icon */
export const DEFAULT_NOTICE_ICONS: Record<NoticeCategory, string> = Object.fromEntries(
  NOTICE_CATEGORIES.map((c) => [c, NOTICE_TEMPLATES[c].icon]),
) as Record<NoticeCategory, string>;

/** WCAG-friendly category colors (background / accent pairs). */
export const NOTICE_CATEGORY_COLORS: Record<NoticeCategory, { bg: string; fg: string; border: string }> = {
  MAINTENANCE: { bg: '#FFF8E6', fg: '#7A4F00', border: '#E6A817' },
  WATER_SHUTOFF: { bg: '#E8F2FC', fg: '#0C3D6E', border: '#2563EB' },
  CONSTRUCTION: { bg: '#F3E8FF', fg: '#5B21B6', border: '#9333EA' },
  GENERAL_INFO: { bg: '#EEF4FA', fg: '#1E4470', border: '#1E4470' },
  ELEVATOR: { bg: '#ECFEFF', fg: '#0E4F5C', border: '#0891B2' },
  HEATING: { bg: '#FFF1ED', fg: '#9A3412', border: '#EA580C' },
};

/** Severity badge colors: gray → blue → orange → red */
export const SEVERITY_COLORS: Record<NoticeSeverity, string> = {
  LOW: '#6B7280',
  MEDIUM: '#2563EB',
  HIGH: '#EA580C',
  CRITICAL: '#D64545',
};

export const noticeAttachmentSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(['file', 'link']),
  name: z.string().trim().min(1).max(200),
  url: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), { message: 'INVALID_ATTACHMENT_URL' }),
  mimeType: z.string().trim().max(120).optional(),
});

export type NoticeAttachment = z.infer<typeof noticeAttachmentSchema>;

const buildingNoticeFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  category: z.enum(NOTICE_CATEGORIES),
  severity: z.enum(SEVERITIES).default('MEDIUM'),
  icon: z.string().trim().min(1).max(64).optional(),
  attachmentUrl: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), { message: 'INVALID_ATTACHMENT_URL' })
    .optional()
    .nullable(),
  attachments: z.array(noticeAttachmentSchema).max(10).default([]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  affectsLaundry: z.boolean().default(false),
  showOnLogin: z.boolean().default(true),
  sendPushNotification: z.boolean().default(false),
});

export const createBuildingNoticeSchema = buildingNoticeFieldsSchema.refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  {
    message: 'END_BEFORE_START',
    path: ['endTime'],
  },
);

export const updateBuildingNoticeSchema = buildingNoticeFieldsSchema.partial().refine(
  (data) => {
    if (!data.startTime || !data.endTime) return true;
    return new Date(data.endTime) > new Date(data.startTime);
  },
  { message: 'END_BEFORE_START', path: ['endTime'] },
);

export type CreateBuildingNoticeInput = z.infer<typeof createBuildingNoticeSchema>;
export type UpdateBuildingNoticeInput = z.infer<typeof updateBuildingNoticeSchema>;

export function listNoticeCategories(): NoticeCategory[] {
  return [...NOTICE_CATEGORIES];
}

export function getNoticeTemplate(category: NoticeCategory): NoticeTemplateDefinition {
  return NOTICE_TEMPLATES[category];
}

export function defaultIconForCategory(category: NoticeCategory): string {
  return NOTICE_TEMPLATES[category].icon;
}

export function noticeCategoryColors(category: NoticeCategory) {
  return NOTICE_CATEGORY_COLORS[category];
}

export function resolveNoticeTemplateFields(
  category: NoticeCategory,
  translate: (key: string) => string,
): {
  icon: string;
  title: string;
  body: string;
  affectsLaundry: boolean;
  severity: NoticeSeverity;
} {
  const template = getNoticeTemplate(category);
  return {
    icon: template.icon,
    title: translate(template.titleKey),
    body: translate(template.bodyKey),
    affectsLaundry: template.defaultAffectsLaundry ?? false,
    severity: template.defaultSeverity ?? 'MEDIUM',
  };
}

export function isTemplateFieldValue(
  category: NoticeCategory,
  field: 'title' | 'body',
  value: string,
  translate: (key: string) => string,
): boolean {
  const template = getNoticeTemplate(category);
  const key = field === 'title' ? template.titleKey : template.bodyKey;
  return value.trim() === translate(key).trim();
}

export function normalizeNoticeAttachments(
  attachments: NoticeAttachment[] | null | undefined,
  legacyUrl: string | null | undefined,
): NoticeAttachment[] {
  const list = attachments ?? [];
  if (legacyUrl && !list.some((a) => a.url === legacyUrl)) {
    list.push({
      id: 'legacy-link',
      kind: 'link',
      name: 'Link',
      url: legacyUrl,
    });
  }
  return list;
}

export function isNoticeActive(
  notice: { startTime: Date | string; endTime: Date | string; archivedAt?: Date | string | null },
  now = new Date(),
): boolean {
  if (notice.archivedAt) return false;
  const start = new Date(notice.startTime);
  const end = new Date(notice.endTime);
  return now >= start && now <= end;
}

export function isNoticeUpcoming(
  notice: { startTime: Date | string; archivedAt?: Date | string | null },
  now = new Date(),
): boolean {
  if (notice.archivedAt) return false;
  return new Date(notice.startTime) > now;
}

export function isNoticeExpired(
  notice: { endTime: Date | string; archivedAt?: Date | string | null },
  now = new Date(),
): boolean {
  if (notice.archivedAt) return true;
  return new Date(notice.endTime) < now;
}

export function noticeSortPriority(notice: {
  severity: NoticeSeverity;
  startTime: Date | string;
}): number {
  const severityWeight: Record<NoticeSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return severityWeight[notice.severity] * 1_000_000_000_000 + new Date(notice.startTime).getTime();
}
