import { describe, expect, it } from 'vitest';
import {
  createBuildingNoticeSchema,
  getNoticeTemplate,
  isNoticeActive,
  isNoticeExpired,
  isNoticeUpcoming,
  listNoticeCategories,
  noticeCategoryColors,
  resolveNoticeTemplateFields,
  NOTICE_TEMPLATES,
} from './building-notices.js';
import { NOTICE_CATEGORIES } from './constants.js';

describe('building-notices', () => {
  it('validates create schema with attachments', () => {
    const result = createBuildingNoticeSchema.safeParse({
      title: 'Water shutoff',
      body: 'Cold water unavailable 09:00–12:00.',
      category: 'WATER_SHUTOFF',
      severity: 'HIGH',
      attachments: [
        { id: '1', kind: 'file', name: 'plan.pdf', url: '/uploads/notices/b1/plan.pdf', mimeType: 'application/pdf' },
      ],
      startTime: '2026-07-20T07:00:00.000Z',
      endTime: '2026-07-20T10:00:00.000Z',
      affectsLaundry: true,
      sendPushNotification: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects end before start', () => {
    const result = createBuildingNoticeSchema.safeParse({
      title: 'Test',
      body: 'Test body',
      category: 'GENERAL_INFO',
      startTime: '2026-07-20T10:00:00.000Z',
      endTime: '2026-07-20T09:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('exposes a template for every category', () => {
    for (const category of NOTICE_CATEGORIES) {
      expect(NOTICE_TEMPLATES[category].icon).toBeTruthy();
      expect(NOTICE_TEMPLATES[category].titleKey).toContain(category);
    }
    expect(listNoticeCategories()).toEqual([...NOTICE_CATEGORIES]);
  });

  it('resolves template fields via translate function', () => {
    const translate = (key: string) => key;
    const fields = resolveNoticeTemplateFields('WATER_SHUTOFF', translate);
    expect(fields.icon).toBe(getNoticeTemplate('WATER_SHUTOFF').icon);
    expect(fields.title).toBe('notices.template.WATER_SHUTOFF.title');
    expect(fields.affectsLaundry).toBe(true);
  });

  it('maps accessible category colors', () => {
    const colors = noticeCategoryColors('WATER_SHUTOFF');
    expect(colors.fg).toMatch(/^#/);
    expect(colors.bg).toMatch(/^#/);
  });

  it('computes notice lifecycle', () => {
    const now = new Date('2026-07-20T09:30:00.000Z');
    const notice = {
      startTime: '2026-07-20T08:00:00.000Z',
      endTime: '2026-07-20T10:00:00.000Z',
      archivedAt: null,
    };
    expect(isNoticeActive(notice, now)).toBe(true);
    expect(isNoticeUpcoming(notice, now)).toBe(false);
    expect(isNoticeExpired(notice, now)).toBe(false);
  });
});
