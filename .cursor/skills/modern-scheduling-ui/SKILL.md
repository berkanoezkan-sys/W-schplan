---
name: modern-scheduling-ui
description: Designs and refactors modern, minimal UI for resource scheduling and reservation platforms (laundry, rooms, shifts, equipment). Applies progressive disclosure, anti-redundancy patterns, and mobile-first layouts for Expo/React Native apps. Use when improving UI, redesigning screens, reducing visual clutter, or building scheduling/booking/reservation flows in Woeschplan or similar platforms.
---

# Modern Scheduling UI

Apply when designing or refactoring UI for resource-scheduling apps: shared laundry, meeting rooms, shift planners, equipment booking.

## Core Principle

**One primary task per screen.** Users should know what to do within 3 seconds. Everything else is progressive disclosure.

Information hierarchy (top → bottom):
1. **Action** — what needs attention now (active timer, next reservation, conflict)
2. **Context** — supporting status (availability, schedule snippet)
3. **Detail** — drill-down on demand (full list, history, settings)

---

## Anti-Redundancy Checklist

Before shipping UI changes, verify:

- [ ] **No double titles** — if Expo header shows the title, remove in-page `<Heading>` on tab screens
- [ ] **No duplicate status** — don't show stat count + full list of the same items (e.g. defective count card + defective machine cards)
- [ ] **One path per action** — single entry point for reserve, report defect, checklist (not dashboard + machine + timer)
- [ ] **No Card wrapping a single Button** — use list rows or segmented pickers instead
- [ ] **Shared primitives** — use `Screen`, `TextField`, `OptionPicker`, `ListRow` from `components/ui.tsx`; never copy-paste layout/input styles
- [ ] **All strings via `t()`** — no hardcoded German/English in screens; stack titles too
- [ ] **Max 3–5 widgets** on dashboard above the fold

---

## Woeschplan Design System

Extend existing tokens in `apps/mobile/lib/theme.ts` and primitives in `apps/mobile/components/ui.tsx`. Do not introduce Tailwind/NativeWind unless explicitly requested.

| Token | Use |
|-------|-----|
| `colors.primary` `#1E4470` | CTAs, nav tint, active states |
| `colors.accent` `#6BC04A` | Primary actions, tab active, success |
| `colors.primaryLight` `#5BB8E8` | Secondary accents |
| `colors.background` `#F8FAFB` | Screen background |
| `colors.surface` | Cards, inputs, elevated content |
| `spacing.md` (16) | Default padding; 8px grid |
| `typography.title/heading/body/caption/label` | Type scale — never ad-hoc font sizes |

**Visual tone:** Swiss clean — generous whitespace, subtle borders over heavy shadows, semantic color only for status/alerts.

---

## Screen Patterns

### Dashboard → "What's happening now"

Replace stacked equal-weight cards with a **hero + compact actions** layout:

```
┌─────────────────────────────┐
│  [Hero: active timer OR     │  ← largest element, tappable
│   next reservation OR       │
│   "Reserve a machine" CTA]  │
├─────────────────────────────┤
│  ● 3 available  ● 1 in use  │  ← inline stat pills, not 3 cards
├─────────────────────────────┤
│  Quick actions (icon row)   │  ← scan · reserve · report
└─────────────────────────────┘
```

Rules:
- Show **one hero state** with priority: active timer > next reservation > empty CTA
- Stats as **inline pills/chips**, not separate cards
- Defective machines: show count in pill; list only on tap (or in schedule tab)
- Quick actions: 2–3 icon buttons in a row, not full-width stacked buttons

### Schedule → Timeline-first

Primary view for "when is what booked". Prefer:
- **Day timeline** (hour blocks) or compact **list grouped by time**
- Segmented control (Today / Week) — reuse shared `SegmentedControl`, not custom toggle per screen
- Each row: machine name, time range, status dot — tappable to machine detail
- Privacy labels as subtle caption, not duplicate headings

### Reserve → Guided flow

Replace Card-per-machine + raw ISO input with:
1. **Machine picker** — horizontal chips or single-column list rows with radio selection
2. **Time picker** — native-style date/time wheels or preset slots ("Next available", "Tonight", "Tomorrow AM")
3. **Duration** — chip group (60 / 90 / 120 min), not free-text unless advanced
4. **Single sticky CTA** at bottom: "Reserve"

Never expose ISO datetime strings to users.

### Machine Detail → Action hub

One screen, contextual actions based on status:
- Available → Reserve
- Reserved (mine) → Start timer / Cancel
- In use (mine) → View timer
- Any → Report defect

Use **action list rows** (icon + label + chevron), not stacked full-width buttons.

### Forms (defect, checklist, timer)

- Shared `TextField` with label, error, accessibility
- Category/severity: **OptionPicker** (horizontal chips or radio list), one component reused everywhere
- Submit button sticky at bottom; secondary actions as text links

---

## Component Additions

When refactoring, add to `components/ui.tsx` (don't scatter):

| Component | Replaces |
|-----------|----------|
| `PageShell` | Copy-pasted `ScrollView` + container/content styles on every screen |
| `TextField` | 5× duplicated `TextInput` styles |
| `SegmentedControl` | Custom view toggles |
| `OptionPicker` | Card+Button lists, button grids for single-select |
| `ListRow` | Card wrapping one line of content + chevron |
| `StatPill` | Individual stat cards |
| `HeroCard` | Large tappable status block for dashboard |
| `QuickActionBar` | Row of icon+label compact buttons |

Keep components presentational — data fetching stays in screen files.

---

## Navigation & Headers

| Screen type | Header | In-page title |
|-------------|--------|---------------|
| Tab root (dashboard, schedule, settings) | Tab header title | **None** |
| Stack push (reserve, machine, defect) | Stack header with back | Optional subtitle only |
| Modal/form | Stack header | Form sections with labels |

Hidden stack screens in `_layout.tsx`: titles must use `t()`, not hardcoded English.

---

## Empty & Loading States

- **Empty:** explain why + one clear action ("No reservations — Reserve a machine")
- **Loading:** skeleton placeholders matching final layout, not full-screen spinner on tab screens
- **Error:** inline banner with retry, not alert-only

---

## Accessibility & Touch

- Min touch target 48×48
- `accessibilityRole` on all interactive elements
- Status conveyed by icon + text, not color alone
- Tap-based fallback for any drag interactions (future calendar)

---

## Refactor Workflow

When asked to improve UI:

1. **Audit** — list redundancy issues (double titles, duplicate data, repeated styles)
2. **Define primary task** per screen in one sentence
3. **Sketch hierarchy** — hero → context → detail
4. **Extract shared components** before restyling individual screens
5. **Refactor dashboard first** — highest visibility, sets pattern
6. **Unify flows** — one defect path, one checklist entry with required params
7. **Complete i18n** — all new/changed strings in `lib/i18n.ts`
8. **Verify** anti-redundancy checklist above

---

## Do Not

- Add decorative gradients, 3D charts, or heavy shadows
- Show more than 5 KPIs on one screen
- Nest Card inside Card
- Create a new selection UI pattern when `OptionPicker` exists
- Duplicate machine status in dashboard AND schedule AND machine detail
- Use pie charts for status counts

---

## Additional Resources

- Screen layout templates and before/after examples: [patterns.md](patterns.md)
