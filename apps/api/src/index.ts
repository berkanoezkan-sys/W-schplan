import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { adminAuthRoutes, onboardingRoutes } from './routes/admin-auth.js';
import { buildingRoutes } from './routes/buildings.js';
import { featureRoutes } from './routes/features.js';
import { settingsRoutes } from './routes/settings.js';
import { administratorSettingsRoutes } from './routes/administrator-settings.js';
import { registrationRoutes, buildingRegistrationRoutes } from './routes/registration.js';
import { processDueTimerNotifications } from './services/timers.js';
import { noticeRoutes } from './routes/notices.js';
import { maintenanceRoutes } from './routes/maintenance.js';
import { dispatchDueMaintenanceReminders } from './services/maintenance-notify.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => c.json({ status: 'ok', service: 'woeschplan-api' }));

app.route('/auth', authRoutes);
app.route('/auth', adminAuthRoutes);
app.route('/auth', administratorSettingsRoutes);
app.route('/onboarding', onboardingRoutes);
app.route('/registration', registrationRoutes);

app.route('/buildings', buildingRoutes);
app.route('/', noticeRoutes);
app.route('/', maintenanceRoutes);
app.route('/', featureRoutes);
app.route('/', settingsRoutes);
app.route('/', buildingRegistrationRoutes);

const port = Number(process.env.PORT ?? 3001);
let server: Server | undefined;
let timerInterval: ReturnType<typeof setInterval> | undefined;
let shuttingDown = false;

function startBackgroundJobs() {
  timerInterval = setInterval(() => {
    processDueTimerNotifications().catch(console.error);
    dispatchDueMaintenanceReminders().catch(console.error);
  }, 60_000);
}

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = undefined;
  }

  if (server) {
    server.close(() => {
      console.log(`Wöschplan API stopped (${signal})`);
      process.exit(0);
    });
    // Force exit if close hangs (e.g. keep-alive connections).
    setTimeout(() => process.exit(0), 500).unref();
    return;
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`Wöschplan API listening on http://localhost:${port}`);
server = serve({ fetch: app.fetch, port });
startBackgroundJobs();

export default app;
