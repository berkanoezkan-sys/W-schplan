# UI Patterns Reference

Concrete layout templates for Woeschplan-style scheduling apps.

## Dashboard — Before vs After

### Before (redundant)
- Heading duplicates tab title
- Separate cards for next reservation, active timer, 3 stat cards, defective list
- 3 full-width stacked buttons at bottom

### After (modern)
```
PageShell (no Heading)
├── HeroCard
│   IF activeTimer → countdown + "View timer" 
│   ELIF nextReservation → machine + time + "View"
│   ELSE → "No upcoming reservation" + primary "Reserve"
├── StatPillRow → [3 available] [1 in use] [2 defective†]
│   † defective pill tappable → defects list
├── QuickActionBar → [Scan QR] [Reserve] [Report]
└── (optional) AlertBanner if checklistNeeded
```

---

## Schedule List Row

```
ListRow
├── left: StatusDot (color from machineStatusColors)
├── center: 
│   ├── machine.name (body, semibold)
│   └── "14:00–16:00 · Room A" (caption)
├── right: privacyLabel chip (caption, muted)
└── onPress → machine/[id]
```

No Card wrapper. Divider or 12px gap between rows. Optional section headers by hour ("14:00").

---

## Machine Picker (Reserve)

```
Caption label: t('reserve.selectMachine')
OptionPicker (variant="list")
├── ListRow selectable, radio on right
│   "Waschmaschine 1" + "Keller" caption
├── ListRow selectable
│   "Tumbler 2" + "Keller" caption
└── ...
```

Selected row: `backgroundColor: colors.accent`, border left 3px primary.

---

## Segmented Control

```
[ Today | Week ]   ← equal width, 44px height, radius 10
```

Active segment: `colors.primary` bg, white text. Inactive: transparent, muted text. Reuse on schedule and any future filtered views.

---

## TextField

```
Label (typography.label)
TextInput
  borderRadius: 12
  borderWidth: 1
  borderColor: error ? danger : border
  minHeight: 48
  paddingHorizontal: 16
Error caption (if error)
```

---

## Hero Card

```
Pressable HeroCard
├── status label (caption, uppercase, muted)
├── primary text (heading) — machine name or countdown
├── secondary text (caption) — room, time
└── trailing chevron or CTA text
background: surface
borderRadius: 20
padding: 24
borderLeftWidth: 4
borderLeftColor: status color
```

---

## Quick Action Bar

```
View row, space-evenly
├── QuickAction icon="qr-code" label={t('dashboard.scanQr')}
├── QuickAction icon="calendar-plus" label={t('dashboard.reserve')}
└── QuickAction icon="alert-circle" label={t('dashboard.reportProblem')}

Each: 64×64 touch area, icon 24px, caption below
```

---

## Form Screen (Defect)

```
PageShell scroll
├── TextField (description, multiline)
├── OptionPicker label={t('defect.category')} options={categories}
├── OptionPicker label={t('defect.severity')} options={severities} variant="chips"
└── sticky footer: Button primary submit
```

No Heading if stack header shows title.

---

## Color Usage

| Meaning | Color | Usage |
|---------|-------|-------|
| Available | success | dot, pill |
| Reserved | reserved | dot, pill |
| In use | primary | dot, hero accent |
| Defective | danger | dot, pill, alert only |
| Warning | warning | cleaning required, admin notified |

Never use status colors for decoration or category labels unrelated to status.

---

## Motion (optional, future)

When adding Reanimated:
- Hero card subtle scale on press (0.98)
- Segmented control spring transition
- List row fade-in on load
- Timer countdown pulse on last 5 minutes

Keep motion functional, not decorative.
