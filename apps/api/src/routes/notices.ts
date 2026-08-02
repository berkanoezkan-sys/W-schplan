import { Hono } from 'hono';
import { z } from 'zod';
import {
  authMiddleware,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import {
  acknowledgeBuildingNotice,
  acknowledgeBuildingNotices,
  archiveBuildingNotice,
  createBuildingNotice,
  getLoginPopupNotices,
  listBuildingNotices,
  updateBuildingNotice,
} from '../services/building-notices.js';
import { createBuildingNoticeSchema, updateBuildingNoticeSchema } from '@woeschplan/shared';
import { saveNoticeAttachmentFile, resolveNoticeAttachmentPath } from '../services/notice-attachments.js';
import { readFile } from 'node:fs/promises';

export const noticeRoutes = new Hono<{ Variables: AppVariables }>();
noticeRoutes.use('*', authMiddleware);

noticeRoutes.get('/buildings/:buildingId/notices', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const includeArchived = c.req.query('includeArchived') === 'true';

  try {
    await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const result = await listBuildingNotices({ buildingId, userId, includeArchived });
    return c.json(result);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

noticeRoutes.get('/buildings/:buildingId/notices/popup', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const notices = await getLoginPopupNotices({ buildingId, userId });
    return c.json({ notices });
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

noticeRoutes.post('/buildings/:buildingId/notices/attachments', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 400);

    const attachment = await saveNoticeAttachmentFile({ buildingId, file });
    return c.json(attachment, 201);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FILE_TOO_LARGE') return c.json({ error: code }, 413);
    if (code === 'UNSUPPORTED_FILE_TYPE') return c.json({ error: code }, 415);
    throw error;
  }
});

noticeRoutes.get('/uploads/notices/:buildingId/:fileName', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const fileName = c.req.param('fileName');

  try {
    await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const filePath = resolveNoticeAttachmentPath(buildingId, fileName);
    const data = await readFile(filePath);
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
    return new Response(data, { headers: { 'Content-Type': mime } });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

noticeRoutes.post('/buildings/:buildingId/notices', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = createBuildingNoticeSchema.parse(await c.req.json());
    const notice = await createBuildingNotice({ buildingId, userId, input: body });
    return c.json(notice, 201);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

noticeRoutes.patch('/buildings/:buildingId/notices/:noticeId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const noticeId = c.req.param('noticeId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = updateBuildingNoticeSchema.parse(await c.req.json());
    const notice = await updateBuildingNotice({ buildingId, noticeId, userId, input: body });
    return c.json(notice);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'END_BEFORE_START') return c.json({ error: code }, 400);
    throw error;
  }
});

noticeRoutes.post('/buildings/:buildingId/notices/:noticeId/archive', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const noticeId = c.req.param('noticeId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const notice = await archiveBuildingNotice({ buildingId, noticeId, userId });
    return c.json(notice);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

noticeRoutes.post('/buildings/:buildingId/notices/:noticeId/acknowledge', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const noticeId = c.req.param('noticeId');

  try {
    await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const result = await acknowledgeBuildingNotice({ buildingId, noticeId, userId });
    return c.json(result);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

const bulkAckSchema = z.object({ noticeIds: z.array(z.string().uuid()).min(1) });

noticeRoutes.post('/buildings/:buildingId/notices/acknowledge', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = bulkAckSchema.parse(await c.req.json());
    const result = await acknowledgeBuildingNotices({
      buildingId,
      userId,
      noticeIds: body.noticeIds,
    });
    return c.json(result);
  } catch (error) {
    throw error;
  }
});
