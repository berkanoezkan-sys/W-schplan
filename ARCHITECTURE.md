# Wöschplan — Architecture

> **Governance:** This document is the single source of truth for technical architecture and platform standards.
> **Before implementing any feature, Cursor (and all contributors) must read and follow this document.**
> When a permanent architectural decision is made, update this file in the same change set.

For business rules, UX flows, and product decisions, see [PRODUCT.md](./PRODUCT.md).

---

## 1. Project vision

**Wöschplan** is a mobile-first platform for shared laundry scheduling in Swiss apartment buildings.

Residents book washing machines and tumble dryers, run cycle timers, complete cleaning checklists, and report defects. Property administrators configure buildings, machines, booking rules, and resident access. The product prioritizes clarity, privacy, reliability, and compliance with Swiss housing norms (quiet hours, house rules, emergency contacts).

Long-term direction: a scalable multi-tenant SaaS platform for property management companies, with optional white-label deployments and integrations.

---

## 2. Supported platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | Primary | Native navigation, HIG-aligned headers, blur effects, wheel pickers |
| **Android** | Primary | Material Design 3 patterns, slide transitions, left-aligned titles |
| Web (Expo) | Secondary | Development and fallback only; not a shipping target for MVP |

- Minimum Node.js: **20+**
- Mobile runtime: **Expo SDK 53**, React Native, Expo Router
- Do not introduce platform-specific business logic in UI screens; isolate platform differences in shared components and `lib/navigation/`.

---

## 3. Repository structure

```
Woeschplan/
├── apps/
│   ├── mobile/          # Expo React Native app (iOS, Android, Web)
│   └── api/             # REST API (Hono + Prisma + PostgreSQL)
├── packages/
│   └── shared/          # Zod schemas, validation, constants, pure business helpers
├── ARCHITECTURE.md      # This file — technical source of truth
├── PRODUCT.md           # Business rules and UX decisions
└── README.md            # Setup and quick start
```

### Layer responsibilities

| Layer | Responsibility | Must not contain |
|-------|----------------|------------------|
| `packages/shared` | Types, Zod schemas, booking/reservation logic, privacy labels, checklists, registration helpers | UI, HTTP, database access |
| `apps/api` | HTTP routes, auth, Prisma persistence, authorization guards, service orchestration | React components, mobile-specific code |
| `apps/mobile` | Screens, navigation, local state, TanStack Query, AsyncStorage | Duplicated validation rules (import from `@woeschplan/shared`) |

---

## 4. Multi-tenant architecture

Wöschplan uses a **single shared PostgreSQL database** with **logical tenant isolation** at the **organisation** and **building** levels.

### Tenant model

- **Primary tenant boundary:** `Organisation` (property management company).
- **Operational tenant boundary:** `Building` (one property within an organisation).
- **Data isolation:**
  - Organisation-scoped resources (`Organisation`, `OrganisationMembership`, organisation-owned `Building` rows) must filter by `organisationId`.
  - Building-scoped resources must filter by `buildingId` (directly or via `laundryRoom → building`, `resource → laundryRoom → building`, etc.).
  - Property administrators (`User.platformRole = PROPERTY_ADMIN`) may only access buildings where `Building.organisationId` matches their `User.organisationId`.
- **User scope:**
  - A property administrator belongs to exactly one organisation created at self-registration (future: additional orgs via invitation only).
  - A resident belongs to one or more buildings via `BuildingMembership`. Role is **per building**, not global.
- **Settings storage:**
  - Organisation profile: `Organisation` (name, contact, onboarding state)
  - Building-scoped JSON: `Building.bookingRules`, `Building.houseRules`
  - User-scoped JSON: `User.administratorSettings` (company contact, office hours)
  - Machine-scoped JSON: `Resource.cleaningChecklistConfiguration`

### Authorization principle

> Never trust client-supplied `organisationId` or `buildingId` without verifying membership and role on the server.

API handlers must:

1. Authenticate the JWT
2. Resolve the target organisation/building from the resource
3. Verify `OrganisationMembership` / `BuildingMembership` and required role
4. Reject cross-organisation access even if IDs are tampered with in URLs or request bodies
5. Apply building timezone and rules before mutating reservations

Platform roles (`SUPER_ADMIN`, `PLATFORM_ADMIN`) are assigned **only on the backend** and are not exposed to public registration endpoints.

### Scalability path

The current single-database design is intentional for MVP. Future horizontal scaling options (read replicas, connection pooling, optional row-level security) must preserve the same tenant boundary semantics documented here.

---

## 5. User roles

Four conceptual layers. Implementation mapping to current enums is noted.

| Role | Scope | Capabilities |
|------|-------|--------------|
| **Super Admin** | Platform | Manage all organisations, buildings, and platform configuration. **Schema support added; not yet exposed in UI.** |
| **Platform Admin** | Platform | Operational platform administration. **Schema support added; assign only on backend.** |
| **Property Admin** | One organisation | Self-register a new organisation; configure buildings, laundry rooms, machines, booking rules, registration links, QR codes; resolve defects. |
| **Resident** | Assigned building(s) | View schedule, create/cancel own reservations, run timers, complete checklists, report defects. |

### Current implementation mapping

| Conceptual role | DB / code today | Notes |
|-----------------|-----------------|-------|
| Property Admin (organisation owner) | `User.platformRole = PROPERTY_ADMIN` + `OrganisationMembership.role = OWNER` | Created via `/auth/register-admin`; must verify email before dashboard access |
| Property Admin (building operations) | `BuildingMembership.role = ADMINISTRATOR` | Granted when admin creates/manages a building in their organisation |
| Property Admin (invited, future) | `OrganisationInvitation` + `OrganisationMembership` | Public registration must **not** join existing organisations |
| Resident | `BuildingMembership.role = RESIDENT` | Default role on building-token registration |
| Super Admin | `User.platformRole = SUPER_ADMIN` | Backend-only assignment |
| Platform Admin | `User.platformRole = PLATFORM_ADMIN` | Backend-only assignment |

When adding Super Admin UI, update this section and [PRODUCT.md](./PRODUCT.md) role matrix in the same PR.

---

## 6. Building structure

A **Building** contains the full operational configuration for one property.

```
Building
├── LaundryRoom[]          # One or more laundry rooms (floor, instructions, block status)
│   └── Machine[]          # Washing machines and tumble dryers
├── ChecklistTemplate[]    # Per machine type (washer / dryer)
├── BuildingRegistration   # Invitation token for resident self-registration
├── BuildingNotice[]       # Time-limited notices & events (maintenance, shutoffs, info)
└── settings (JSON)
    ├── bookingRules       # See §7
    └── houseRules         # See below
```

### Laundry rooms

- Each room has a name, optional floor, instructions, and `isActive` flag.
- Rooms can be temporarily blocked (`blockedUntil`, `blockReason`) — blocks cascade to scheduling visibility.
- Machines belong to exactly one laundry room.

### Machines

- Types: `WASHING_MACHINE`, `TUMBLE_DRYER`
- Each machine has a unique `qrCodeIdentifier` for scan-to-open flows.
- Status lifecycle: `AVAILABLE` → `RESERVED` → `IN_USE` → (`CLEANING_REQUIRED` | `AVAILABLE`) with defect/repair branches (`DEFECTIVE`, `ADMINISTRATION_NOTIFIED`, `UNDER_REPAIR`, `OUT_OF_SERVICE`).
- Default cycle duration: `estimatedDefaultRuntime` (minutes).

### Booking rules (building-level)

Stored in `Building.bookingRules` as JSON validated by `bookingRulesSchema` in `@woeschplan/shared`. See [PRODUCT.md § Booking rules](./PRODUCT.md#booking-rules).

### Washing hours and quiet hours

Stored in `Building.houseRules`:

- **Washing hours (`washingHours`):** Time range when laundry use is permitted (default `06:00–22:00`).
- **Quiet hours (`quietHours`):** Derived automatically as the inverse of washing hours (`deriveQuietHours()` in shared). Reservations must not overlap quiet hours unless explicitly overridden in a future product decision.

### Cleaning rules

- Checklist templates per building and machine type (`ChecklistTemplate`).
- Items have label, mandatory flag, enabled flag, order, and category (`after_cycle`, `maintenance`).
- Completion tracked in `ChecklistCompletion`; incomplete checklists can trigger reminders (see PRODUCT.md).

### Contacts

Two contact layers:

| Layer | Storage | Purpose |
|-------|---------|---------|
| **Building contact** | `houseRules.contact` (caretaker / Hauswart) | On-site building contact for residents |
| **Property management** | `User.administratorSettings.companyContact` | Verwaltung / management company (admin-only settings) |

### Emergency contacts

- Stored in `houseRules.emergencyContacts`.
- Include Swiss standard numbers (117, 118, 143, 144) as non-editable defaults plus building-specific contacts.
- Residents have read-only access; property admins can edit.

### Building notices & events

Time-limited operational notices (maintenance, water shutoffs, construction, general info) are stored in `BuildingNotice` (one row per notice, scoped to `buildingId`).

#### Category template registry

Default title, description, and icon are **not hard-coded in UI**. They come from a single registry in `@woeschplan/shared`:

| Registry | Location | Purpose |
|----------|----------|---------|
| `NOTICE_CATEGORIES` | `constants.ts` | Enum source of truth (also mirrored in Prisma `NoticeCategory`) |
| `NOTICE_TEMPLATES` | `building-notices.ts` | Per category: `icon`, `titleKey`, `bodyKey`, optional `defaultAffectsLaundry`, `defaultSeverity` |
| i18n | `apps/mobile/lib/i18n.ts` | Strings for `notices.template.{CATEGORY}.title/body` |

**Adding a new category (no UI code changes):**

1. Add value to `NoticeCategory` in Prisma + `NOTICE_CATEGORIES` in shared
2. Add one entry to `NOTICE_TEMPLATES` with i18n keys
3. Add `notices.category.*` and `notices.template.*` strings in i18n
4. Run migration — category chips, calendar colors, and edit form pick it up via `listNoticeCategories()`

Admin edit screen applies templates on category change. Title/body remain **editable**; fields reset only when they still match the previous category template.

#### Data model

| Field | Purpose |
|-------|---------|
| `category` | `NoticeCategory` enum — drives template, calendar color, chip icon |
| `severity` | Reuses `Severity` enum — badge color (gray / blue / orange / red) and sort order |
| `icon` | Ionicons name; defaulted from template, stored on notice |
| `startTime` / `endTime` | Visibility window (UTC); displayed in `Building.timezone` |
| `attachments` | JSON array of `{ id, kind, name, url, mimeType? }` — files + links |
| `attachmentUrl` | Legacy primary link; kept for backward compatibility |
| `affectsLaundry` | Calendar overlay on machine lanes — **does not block reservations** |
| `showOnLogin` | Login pop-up until acknowledged |
| `sendPushNotification` | Creates in-app `Notification` rows (`BUILDING_NOTICE`) for residents when active |
| `pushNotificationSentAt` | Prevents duplicate push dispatch |
| `archivedAt` | Soft archive |

#### Attachments

| Kind | Storage | Upload |
|------|---------|--------|
| `file` | `uploads/notices/{buildingId}/{uuid}-{filename}` on API host | `POST /buildings/:id/notices/attachments` (multipart) |
| `link` | URL only in `attachments` JSON | Added in admin form |

Download: `GET /uploads/notices/:buildingId/:fileName` (authenticated, building membership required).

Allowed file types: PDF, JPEG/PNG/WebP/GIF, plain text, Word (.doc/.docx). Max 10 MB.

#### Resident UX

- Login pop-up for active, unacknowledged notices (`BuildingNoticeAcknowledgment` per user)
- **Building Notices** list (`/(main)/notices`)
- Calendar via schedule API `notices[]`
- Live preview card on admin edit screen

#### Admin UX

- CRUD: `/(main)/building-notices`, `/(main)/building-notice-edit`
- Category chips with embedded icons (no separate icon picker)
- Visibility schedule, delivery toggles, attachment picker + link field
- Archive: `POST .../notices/:id/archive`

#### API routes

- `GET /buildings/:buildingId/notices`
- `GET /buildings/:buildingId/notices/popup`
- `POST /buildings/:buildingId/notices` (admin)
- `PATCH /buildings/:buildingId/notices/:noticeId` (admin)
- `POST /buildings/:buildingId/notices/:noticeId/archive` (admin)
- `POST /buildings/:buildingId/notices/attachments` (admin, multipart)
- `GET /uploads/notices/:buildingId/:fileName` (member)
- `POST .../acknowledge` (resident)

Shared validation: `packages/shared/src/building-notices.ts`.

### Resident schedule calendar (mobile)

The resident schedule tab (`apps/mobile/app/(main)/(tabs)/schedule.tsx`) renders `ResidentCalendar` — a timeline-first booking view aligned with Apple Calendar density and progressive disclosure.

#### Views

| View | Component | Behaviour |
|------|-----------|-----------|
| **Day** | `CalendarDayView` | One column per filtered machine; 24h grid with hour lines every 2h; reservations as rounded event cards with accent bar |
| **Week** | `CalendarWeekView` | Horizontally scrollable day columns (`WEEK_COLUMN_WIDTH`); vertically scrollable shared timeline; event cards show machine + time |
| **Month** | `CalendarMonthView` | Capacity heatmap; tap a date to drill into day view |

Layout constants and pure helpers live in `apps/mobile/components/calendar/calendarLayout.ts`. Block rendering in `CalendarBlocks.tsx`.

#### Scalable filtering

Filter state `{ laundryRoomId, resourceId }` is owned by `ResidentCalendar` and passed to `useResidentSchedule(view, anchorDate, filters)`.

| Filter | UI | API query param | Notes |
|--------|-----|-----------------|-------|
| Laundry room | `CalendarFilterBar` chip row (shown when building has >1 room) | `laundryRoomId` | Clears machine filter when room changes unless machine still in room |
| Machine | `CalendarFilterBar` chip row | `resourceId` | FAB pre-fills `/(main)/reserve?resourceId=` when set |
| View + date | Segmented control + swipe / chevrons | `view`, `date` | Query key includes all params; 15s refetch |

Machine list is sourced from `useBuilding().getAllResources()` merged with live schedule status so chips stay stable while data loads. Server filtering in `apps/api/src/services/schedule.ts` applies the same params — never filter only on the client.

#### Timer and buffer logic

Live countdowns use a 1s tick from `useLiveNow()`. Pure state helpers in `calendarLayout.ts`:

| Helper | Purpose |
|--------|---------|
| `getReservationTimerState(reservation, nowMs)` | Returns `{ remainingMs, progress, active }` when reservation has `activeTimer.expectedCompletionTime` and current time is within the slot |
| `getBufferTimerState(block, nowMs)` | Returns buffer countdown until machine is available again |
| `formatCountdown(ms)` | Tabular `m:ss` display |
| `reservationProgress(...)` | 0–1 fill width for in-progress cards |

Schedule API enriches reservations with `activeTimer.remainingMs` from the timers service; UI recomputes from `expectedCompletionTime` + `useLiveNow` for smooth 1s updates without extra requests.

Reservation cards (`ReservationBlock`) use tinted fills + accent bar (not solid blocks). Active timers show live dot + countdown; buffers show dashed-style card with countdown.

#### Overlay z-order (bottom → top)

1. Hour grid lines
2. Quiet hours — subtle fill only (`pointerEvents: none`)
3. Laundry notice overlay (`affectsLaundry`) — subtle tint; does **not** block bookings
4. Reservations + buffer blocks
5. Now indicator (today / current day column only in week view)

Building notices appear as **compact icon banners** (`BuildingNoticesSection`, `NoticeIconBanner`) — not full-width timeline blocks. Day view also shows a horizontal banner row above the grid for same-day notices.

#### Navigation

- Tap reservation → `/(main)/machine/{resourceId}`
- Tap machine header → same
- Tap notice banner → bottom sheet with detail
- FAB → reserve (with optional pre-selected machine)

### Office hours

- Stored in `User.administratorSettings.officeHours` (per weekday, multiple periods).
- Displayed to residents for property management availability; not enforced on reservation slots.

---

## 7. Reservation system (architecture)

### Separation by machine type

Booking rules are **nested per machine type** in `bookingRules`:

```typescript
{
  maxActiveReservationsPerResident: number,
  allowRecurringReservations: boolean,
  washingMachine: MachineTypeBookingRules,
  tumbleDryer: MachineTypeBookingRules,
}
```

Use `resolveBookingRulesForMachine()` from `@woeschplan/shared` — never read flat legacy fields.

### Conflict prevention

- Overlap detection runs server-side before insert/update.
- Buffer minutes between reservations apply per machine.
- All times stored as UTC; display and rule evaluation use `Building.timezone` (default `Europe/Zurich`).

### Timer coupling

- A `Timer` may link to a `Reservation` but can also run standalone after QR scan.
- Timer state syncs to API; mobile persists active timer metadata in AsyncStorage for refresh resilience.

### Recurring reservations

- Schema supports `recurrenceRule`; **disabled by default** (`allowRecurringReservations: false`). Enable in a future phase per PRODUCT.md roadmap.

---

## 8. Authentication and administrator onboarding

### Login

- JWT-based auth (7-day expiry) via existing `/auth/login`.
- Property administrators with unverified email receive `403 EMAIL_NOT_VERIFIED` and cannot access `(main)` routes.
- Login, registration, password reset (future), and verification endpoints are rate-limited in memory (`middleware/rate-limit.ts`).

### Property administrator self-registration

Public endpoint: `POST /auth/register-admin`

On success:

1. Create `Organisation` (status `PENDING`, onboarding `PENDING_EMAIL_VERIFICATION`)
2. Create `User` with `platformRole = PROPERTY_ADMIN`, `status = PENDING_VERIFICATION`
3. Create `OrganisationMembership` with `role = OWNER`
4. Set `Organisation.ownerId` and `User.organisationId`
5. Send email verification token (`EmailVerificationToken.tokenHash` only — plain token emailed once)
6. **Do not** issue a dashboard JWT until email is verified

Self-registration **never** joins an existing organisation. Additional administrators for an existing organisation will use `OrganisationInvitation` (schema prepared; acceptance flow is future work).

### Email verification

- Verify: `GET /auth/verify-email/:token`
- Resend: `POST /auth/resend-verification`
- Tokens are single-purpose, SHA-256 hashed, 24-hour expiry
- After verification: organisation status → `ACTIVE`, onboarding → `COMPANY_PROFILE`, user receives JWT

Environment:

| Variable | Purpose |
|----------|---------|
| `APP_BASE_URL` | Base URL embedded in verification links (mobile/web) |
| `SMTP_URL` | Optional HTTP webhook for production email delivery; logs to console in development |

### Administrator onboarding (post-verification)

Persisted on `Organisation.onboardingStatus` and `Organisation.onboardingData`.

| Step | Status | Action |
|------|--------|--------|
| 1 Company profile | `COMPANY_PROFILE` | Confirm company contact, phone, email, website, office hours |
| 2 First building | `FIRST_BUILDING` | Create building with structured Swiss address fields |
| 3 Laundry setup | `LAUNDRY_SETUP` | Create laundry room + washers/dryers/drying rooms |
| 4 Resident invitation | `RESIDENT_INVITATION` | Generate building registration token, link, QR code |
| Done | `COMPLETED` | Navigate to admin dashboard |

API routes under `/onboarding/*` (authenticated, property-admin only).

---

## 9. Resident registration

### Flow

1. Property admin generates or regenerates a building registration token (`BuildingRegistration`).
2. Admin shares **invitation link** (`/join/{token}`) or **QR code** (`woeschplan://join/{token}`).
3. Resident opens link → validates token via `GET /registration/validate/:token`.
4. Resident registers (email, password, name, apartment number) → receives JWT + `BuildingMembership` as `RESIDENT`.
5. Registration event logged in `ResidentRegistration`.

### Security

- Store only `tokenHash` in the database; plain token shown once to admin.
- Token can be regenerated (invalidates previous links).
- `selfRegistrationEnabled` flag allows admins to pause new sign-ups.

### Paths

Use `buildRegistrationPaths()` from `@woeschplan/shared` for consistent deep links and web paths.

---

## 10. Navigation and back behavior

Mobile navigation uses **Expo Router** with a tab shell and stack overlays.

### Structure

```
app/
├── index.tsx              # Login
├── register-admin.tsx     # Property administrator self-registration
├── verify-email.tsx       # Awaiting verification + resend
├── verify/[token].tsx     # Email verification deep link
├── onboarding.tsx         # Administrator onboarding wizard
├── join/[token].tsx       # Public resident registration deep link
└── (main)/
    ├── (tabs)/            # dashboard, schedule, notifications, settings
    └── [detail screens]   # machine, reserve, timer, checklist, defect, admin editors
```

### Rules

1. **Tabs are root navigation** — detail screens push onto the stack above tabs; never nest stacks inside stacks without reason.
2. **Back button always visible** on detail screens (`headerBackVisible: true` via `detailScreenOptions()`).
3. **iOS:** Show localized back title (`common.back`); use system material blur header; default animation.
4. **Android:** Slide-from-right animation; left-aligned title; no back title text.
5. **Unsaved changes:** Use `useUnsavedChangesGuard` / `useEditableHeader` for admin edit screens — back or cancel prompts before discarding.
6. **Deep links:** Registration (`/join/:token`) and machine QR (`/scan`, machine routes) must resolve without requiring prior tab state.
7. **Auth redirect:** Unauthenticated users hitting `(main)` redirect to `/`. Property admins with pending verification redirect to `/verify-email`; incomplete onboarding redirects to `/onboarding`.

Centralize stack options in `apps/mobile/lib/navigation/stackOptions.ts` — do not duplicate per screen.

---

## 11. UI/UX principles

Align with **Apple Human Interface Guidelines** (iOS) and **Material Design 3** (Android) while keeping a unified Wöschplan brand (`lib/theme.ts`).

### Cross-platform

- Swiss-themed palette: clean, trustworthy, accessible contrast.
- Typography: consistent scale via shared `typography` tokens.
- Spacing: use `spacing` and `radius` tokens — no magic numbers in screens.
- Loading, empty, and error states: use shared `LoadingState`, `EmptyState`, and error banners from `@/components/ui`.
- Privacy-first schedule labels — never show full names unless building policy allows (see PRODUCT.md).

### iOS-specific

- Native stack headers with blur (`headerBlurEffect: 'systemMaterial'`).
- Wheel pickers via shared `@/components/settings` components (see `.cursor/rules/wheel-pickers.mdc`).
- Haptic feedback on save and wheel selection.

### Android-specific

- Material elevation and ripple via shared button/card components.
- Predictive back gesture support via standard stack navigator (no custom back interception unless unsaved-changes guard).

### Components

- Reuse `@/components/ui` for buttons, cards, text fields, page shells.
- Reuse `@/components/settings` for all pickers and editable admin forms.
- New shared UI goes in `components/`, not inline in screen files.

---

## 12. API and data conventions

| Concern | Standard |
|---------|----------|
| API framework | Hono (`apps/api/src`) |
| ORM | Prisma; schema in `apps/api/prisma/schema.prisma` |
| Validation | Zod schemas in `@woeschplan/shared`; parse at API boundary |
| Auth | JWT (7-day expiry); `Authorization: Bearer` header |
| Errors | Consistent JSON error shape; mobile maps via `ApiError` |
| Migrations | Prisma migrations in `apps/api/prisma/migrations/` |
| Tests | Vitest in shared and API; critical paths: overlap, defects, privacy labels |

---

## 13. Development standards

1. **Read ARCHITECTURE.md and PRODUCT.md before implementing any feature.**
2. **Reuse existing components** — search `components/` and `lib/hooks/` before creating new UI.
3. **No duplicate logic** — business rules live in `@woeschplan/shared`; API services call shared helpers.
4. **Separate UI from business logic** — screens compose hooks and present data; hooks call API; shared package holds pure functions.
5. **Scalable patterns** — prefer building-scoped queries, typed JSON settings, and patch schemas over ad-hoc fields.
6. **Document permanent decisions** — update this file (architecture) or PRODUCT.md (business/UX) when introducing new enums, roles, settings shapes, or navigation patterns.
7. **Minimal scope** — implement only what the task requires; avoid speculative abstractions.
8. **i18n-ready** — user-facing strings via `t()` in mobile; default language `de`, building language configurable.

---

## 14. Future expansion (architecture notes)

These are **not MVP commitments** but inform design choices today:

| Area | Direction | Design constraint now |
|------|-----------|----------------------|
| Multi-property | Property management companies managing many buildings | Keep `BuildingMembership` per building; admin settings on user |
| White-label | Custom branding per deployment | Centralize theme tokens; avoid hard-coded product name in shared package |
| Billing / subscriptions | Stripe or similar per building or per company | Keep platform role separate from building role |
| API integrations | Export calendars, webhooks, property management ERP | Version REST routes; event log table TBD |
| IoT devices | Machine status from connected hardware | `Machine.status` enum extensible; don't assume manual-only transitions |
| Additional shared resources | Bike rooms, guest parking, etc. | Generalize `Machine` / `Reservation` pattern only when second resource type is scoped |

When starting any of the above, add an ADR-style subsection here with the chosen approach.

---

## 15. Related documents

| Document | Purpose |
|----------|---------|
| [PRODUCT.md](./PRODUCT.md) | Business rules, role capabilities, UX flows |
| [README.md](./README.md) | Local development setup |
| `.cursor/rules/wheel-pickers.mdc` | Mandatory wheel picker components |

---

*Last updated: 2026-07-19 (resident calendar UI refactor)*
