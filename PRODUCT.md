# Wöschplan — Product rules & UX decisions

> **Governance:** This document defines business rules and user-facing behavior.
> For technical architecture, stack choices, and code structure, see [ARCHITECTURE.md](./ARCHITECTURE.md).
> **Before implementing any feature, read both documents.**

---

## 1. Product summary

Wöschplan replaces paper laundry schedules and informal WhatsApp coordination in Swiss apartment buildings with a structured, privacy-respecting booking system.

**Primary users:** residents who need a fair, predictable way to use shared laundry machines.
**Secondary users:** property administrators (Verwaltung / Hauswart) who configure rules and handle defects.

---

## 2. Role capabilities matrix

| Capability | Resident | Property Admin | Super Admin |
|------------|:--------:|:--------------:|:-----------:|
| View schedule (privacy labels) | ✓ | ✓ | ✓ |
| Create / cancel own reservation | ✓ | ✓ | — |
| Start / stop cycle timer | ✓ | ✓ | — |
| Complete cleaning checklist | ✓ | ✓ | — |
| Report defect | ✓ | ✓ | — |
| View house rules & contacts | ✓ | ✓ | ✓ |
| Configure booking rules | — | ✓ | ✓ |
| Manage laundry rooms & machines | — | ✓ | ✓ |
| Generate registration link / QR | — | ✓ | ✓ |
| Edit cleaning checklist templates | — | ✓ | ✓ |
| Resolve / update defect status | — | ✓ | ✓ |
| Block laundry room | — | ✓ | ✓ |
| Edit emergency contacts | — | ✓ | ✓ |
| Edit property management contact | — | ✓ | ✓ |
| Create new building | — | ✓* | ✓ |
| Platform-wide administration | — | — | ✓ |

\*Property admins can create buildings they administer. Super Admin (planned) can manage all buildings on the platform.

### Role terminology

- **Resident (Mieter):** Lives in the building; identified by apartment number at registration.
- **Property Admin (Verwaltung / Administrator):** Manages one or more buildings; may work for a property management company.
- **Super Admin:** Internal Wöschplan operator role — not yet implemented.

---

## 3. Building onboarding (property admin)

1. Admin signs in (or registers as first user).
2. Admin creates a building (name, address, timezone, language).
3. System seeds default booking rules, house rules, checklist templates, and emergency contacts.
4. Admin adds laundry rooms and machines.
5. Admin configures booking rules, washing hours, cleaning checklists, and contacts.
6. Admin shares registration QR / link with residents.

Default timezone: `Europe/Zurich`. Default language: `de`.

---

## 4. Resident registration

### Invitation channels

| Channel | Format | Use case |
|---------|--------|----------|
| QR code | `woeschplan://join/{token}` | Poster in laundry room |
| Share link | `https://{app-host}/join/{token}` | Email, WhatsApp, tenant portal |

### Registration form (required fields)

- Email (unique, login identifier)
- Password (minimum 8 characters)
- First name, last name
- Apartment number (required — used for privacy labels and admin identification)

### Rules

- Token must be valid and `selfRegistrationEnabled` must be true.
- On success: user receives `RESIDENT` membership for that building only.
- Already-authenticated users opening a join link should be able to add building membership without re-registering (if implemented).
- Regenerating the token invalidates all previously distributed links/QR codes.
- Admins can disable self-registration without deleting existing residents.

### Post-registration

- Resident lands on dashboard for the joined building.
- Schedule shows privacy labels according to building policy — not raw email addresses.

---

## 5. Privacy labels on schedule

Building setting: `privacyLabelMode`

| Mode | Display example | When to use |
|------|-----------------|-------------|
| `FIRST_NAME` | "Maria" | Small buildings, trusted community |
| `APARTMENT_NUMBER` | "Whg. 4B" | Medium buildings |
| `INITIALS` | "M.S." | Higher privacy |
| `RESERVED` | "Reserviert" | Maximum privacy |

Residents always see their **own** reservations with full detail. Other slots show the configured label only.

---

## 6. Booking rules

Rules are configured **separately for washing machines and tumble dryers** because cycle lengths and usage patterns differ.

### Global (building-level)

| Rule | Default | Description |
|------|---------|-------------|
| `maxActiveReservationsPerResident` | 2 | Concurrent confirmed reservations across all machines |
| `allowRecurringReservations` | false | Phase 2 — weekly repeat bookings |

### Per machine type (`washingMachine` / `tumbleDryer`)

| Rule | Default | Description |
|------|---------|-------------|
| `maxBookingDurationMinutes` | 180 | Maximum slot length (1–12 h in 30-min steps in UI) |
| `maxDaysInAdvance` | 14 | How far ahead residents can book |
| `earliestBookingMinutesFromNow` | 0 | Minimum lead time before slot start |
| `bufferMinutesBetweenReservations` | 15 | Gap enforced after each booking on same machine |
| `cancellationDeadlineMinutes` | 60 | Cancel allowed until this many minutes before start |
| `noShowGracePeriodMinutes` | 15 | After start, slot released if timer not started |

### Scheduling constraints

1. Reservations must fall within **washing hours** for the building's timezone.
2. Reservations must **not** overlap **quiet hours** (inverse of washing hours).
3. No overlapping reservations on the same machine (including buffer).
4. Resident cannot exceed `maxActiveReservationsPerResident`.
5. Machine must be `AVAILABLE` or already reserved by the same user (for edit flows).
6. Blocked laundry rooms hide their machines from booking.

### Cancellation

- Allowed until `cancellationDeadlineMinutes` before start.
- Cancelled slots become immediately available (subject to buffer rules for adjacent slots).

### No-show

- If no timer is started within `noShowGracePeriodMinutes` after reservation start, status may move to `NO_SHOW` and slot becomes available (Phase 2 automation; manual override by admin always allowed).

---

## 7. Washing hours & quiet hours

| Concept | Definition | Default |
|---------|------------|---------|
| **Washing hours** | When laundry use is allowed | 06:00 – 22:00 |
| **Quiet hours** | When laundry use is **not** allowed | 22:00 – 06:00 (auto-derived) |

**UX rule:** When admin changes washing hours, quiet hours update automatically. Show both read-only on resident-facing house rules.

**Product rationale:** Swiss rental agreements commonly restrict laundry use during night hours; automating the inverse reduces admin error.

---

## 8. Machine status & resident actions

| Status | Resident can book? | Resident actions |
|--------|:------------------:|------------------|
| `AVAILABLE` | ✓ | Book, scan QR |
| `RESERVED` | If own slot | Start timer at slot time |
| `IN_USE` | — | View timer (if own) |
| `CLEANING_REQUIRED` | — | Complete checklist before next booking |
| `DEFECTIVE` | — | Report defect (if not already reported) |
| `ADMINISTRATION_NOTIFIED` | — | View status; wait |
| `UNDER_REPAIR` | — | View status |
| `OUT_OF_SERVICE` | — | Hidden from booking |

Admins can manually set status and override scheduling blocks.

---

## 9. Cycle timer

- Resident starts timer when machine cycle begins (from reservation or QR scan).
- Default duration pre-filled from `estimatedDefaultRuntime`.
- Notifications (if enabled): 5 min before end, on completion, 10 min after if checklist incomplete.
- Timer persists across app refresh (AsyncStorage + API sync).
- Completing timer prompts cleaning checklist when configured.

---

## 10. Cleaning checklists

Separate templates for **washing machine** and **tumble dryer**.

### Default intent

Post-cycle cleaning steps (wipe drum, clean lint filter, leave door open, etc.) to maintain shared equipment.

### Rules

- Mandatory items must be checked before submission.
- Completion recorded per machine, optionally linked to reservation.
- Admin can enable/disable/reorder items and mark mandatory vs optional.
- Incomplete checklist after timer: reminder notification (if prefs enabled).

---

## 11. Defect reporting

### Categories

Machine won't start, won't drain, door stuck, water leakage, unusual noise, dryer won't heat, display error, payment issue, dirty machine, other.

### Severity

Low → Critical. **Water leakage** and **display error** are treated as serious (`SERIOUS_DEFECT_CATEGORIES`) — auto-notify administration.

### Workflow

```
REPORTED → ADMINISTRATION_NOTIFIED → UNDER_REVIEW → REPAIR_SCHEDULED → RESOLVED
```

- Resident submits report with category, description, optional photo (Phase 2).
- Serious defects trigger admin notification immediately.
- Admin updates status; affected reservations may trigger `DEFECT_AFFECTING_RESERVATION` notification.
- Machine status syncs with defect state.

---

## 12. Contacts & emergency information

### Building contact (Hauswart)

Name, mobile, email, optional working hours — visible to all building members.

### Property management (Verwaltung)

Company name, contact person, phone, email, website — configured by admin in personal administrator settings; shown on house rules / contact pages.

### Emergency contacts

- **Swiss defaults** (always present, not deletable): Police 117, Fire 118, Rega 1414, Ambulance 144.
- **Building-specific:** Admin-added contacts (e.g. building plumber, on-call caretaker).
- **UX:** Separate sections "Swiss emergency numbers" and "Building & service providers".

### Office hours

Admin-configured availability for property management (per weekday, multiple time periods). Informational only — does not block in-app actions.

---

## 13. Notifications (in-app)

| Type | Trigger | Default on? |
|------|---------|:-----------:|
| Upcoming reservation | Before booked slot | ✓ |
| Reservation starting soon | Near slot start | ✓ |
| Timer almost finished | 5 min before end | ✓ |
| Cycle completed | Timer ends | ✓ |
| Checklist reminder | After cycle if incomplete | ✓ |
| Reservation changed | Admin or system change | ✓ |
| Defect affecting reservation | Machine defect overlaps slot | ✓ |
| Defect status updated | Admin changes defect | ✓ |
| Machine available | Status returns to available | ✓ |

Push notifications (Expo Notifications) — Phase 2. Residents can toggle each type in notification preferences.

---

## 14. QR code flows

| QR type | Target | Behavior |
|---------|--------|----------|
| Building registration | `/join/{token}` | Opens registration for building |
| Machine | `/scan` → machine detail | Opens machine page for timer, booking, checklist, defect |

Machine QR uses `qrCodeIdentifier` — stable per machine until admin regenerates.

---

## 15. Navigation UX rules

| Context | Expected behavior |
|---------|-------------------|
| Tab bar | Always reachable from main tabs; detail screens don't hide tab bar permanently |
| Detail screen back | Returns to previous screen (schedule → machine → back to schedule) |
| Unsaved admin edits | Confirm dialog on back/cancel |
| Login | After login, go to dashboard; preserve pending join token if present |
| Empty building (admin) | Guide to create laundry room → add machines → share registration |

---

## 16. Copy & language

- MVP UI strings: **German** primary via `lib/i18n.ts`.
- Building language setting (`de`, `en`, `fr`, `it`) — full i18n Phase 2.
- Use Swiss conventions: 24h time, `Europe/Zurich` timezone, "Whg." for apartment.

---

## 17. Phase roadmap (product)

### Phase 1 — MVP (current)

All features in ARCHITECTURE.md § MVP: scheduling, timers, checklists, defects, registration, QR, house rules, admin building setup.

### Phase 2 — Planned

- Recurring reservations
- Defect photo uploads
- Waiting list & no-show auto-release
- Full i18n (de/en/fr/it)
- Administrator analytics dashboard
- Push notifications
- Super Admin platform role

### Phase 3+ — Vision

- Multi-property portfolio view for large Verwaltungen
- White-label app deployments
- Subscription billing
- Calendar export & webhooks
- IoT machine status integration
- Additional shared resources (guest laundry, drying rooms)

---

## 18. Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07 | Separate booking rules for washer vs dryer | Different cycle lengths and house rules |
| 2026-07 | Quiet hours auto-derived from washing hours | Prevent admin misconfiguration |
| 2026-07 | Apartment number required at registration | Privacy labels and admin identification |
| 2026-07 | Single shared database multi-tenancy | MVP simplicity; building-scoped isolation |
| 2026-07 | iOS + Android primary; web secondary | Target users are mobile-first residents |

Add new rows when product decisions are made — do not bury decisions only in PR comments.

---

*Last updated: 2026-07-19*
