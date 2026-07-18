# Wöschplan

Shared laundry scheduling for Swiss apartment buildings — mobile-first Expo app with a Node.js API backend.

## Architecture

| Layer | Stack |
|-------|-------|
| Mobile | Expo SDK 53, React Native, Expo Router, TanStack Query |
| API | Hono, Prisma, PostgreSQL, JWT auth |
| Shared | Zod schemas, checklists, privacy labels, constants |

```
Woeschplan/
├── apps/mobile/     # Expo React Native app (iOS, Android, Web)
├── apps/api/        # REST API + Prisma
└── packages/shared/ # Shared types and validation
```

## MVP features (Phase 1)

- Building & machine structure with roles (resident / administrator)
- Daily & weekly schedule with privacy-friendly labels
- Reservation create/cancel with conflict prevention & booking rules
- Machine status tracking
- Timer with persistence across refresh (AsyncStorage + API)
- Washing machine & tumble dryer cleaning checklists
- Defect reporting with administration-notified & resolved workflow
- In-app notifications
- QR code machine access
- House rules page
- Mobile-responsive Swiss-themed UI

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Expo Go app (for mobile testing) or iOS Simulator / Android emulator

## Quick start

### 1. Start database

```bash
docker compose up -d
```

### 2. Configure API

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run migrations & seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start API

```bash
npm run dev:api
```

API runs at `http://localhost:3001`.

### 6. Start mobile app

```bash
npm run dev:mobile
```

Set `EXPO_PUBLIC_API_URL` if testing on a physical device (use your machine's LAN IP):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001 npm run dev:mobile
```

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@woeschplan.local | admin12345 |
| Resident | resident@woeschplan.local | resident12345 |

## Environment variables

| Variable | Location | Description |
|----------|----------|-------------|
| `DATABASE_URL` | apps/api/.env | PostgreSQL connection string |
| `JWT_SECRET` | apps/api/.env | Secret for JWT tokens |
| `PORT` | apps/api/.env | API port (default 3001) |
| `EXPO_PUBLIC_API_URL` | apps/mobile | API base URL for mobile client |

## Testing

```bash
npm test
```

Critical tests cover reservation overlap logic, serious defect detection, and privacy label formatting.

## Database migrations

Migrations live in `apps/api/prisma/migrations/`. Create new migrations with:

```bash
npm run db:migrate
```

## Phase 2 (planned)

- Recurring reservations
- Photo uploads for defects
- Waiting list & no-show release
- Full i18n (de/en/fr/it)
- Administrator analytics
- Push notifications via Expo Notifications

## Publishing to GitHub

Xcode Command Line Tools and GitHub CLI authentication are required on your Mac:

```bash
xcode-select --install          # if git is not available
gh auth login                   # authenticate GitHub CLI
chmod +x scripts/create-github-repo.sh
./scripts/create-github-repo.sh
```

This creates a public repository named **Wöschplan** and pushes the initial commit.

## License

MIT
