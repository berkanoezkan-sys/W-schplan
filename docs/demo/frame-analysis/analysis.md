# Flickering Video Analysis

**Video:** `/Users/berkanprivat/Desktop/For Cursor please check the flickering.mov`  
**Recorded:** 2026-07-19 13:07 (+0200)  
**Duration:** 23.6s · 668×1360 · 60fps H.264  

## Brightness delta spikes (10fps analysis)

| Timestamp | Delta | Notes |
|-----------|-------|-------|
| **0:13.9** | 8.1 | Largest spike — dashboard gray block / layout collapse |
| 0:06.3 | 4.6 | Waschküchen page transition |
| 0:09.3 | 4.5 | Laundry rooms list |
| 0:12.1 | 4.4 | Pre-dashboard navigation |
| 0:16.3 | 4.1 | Dashboard settings section load |
| 0:03.1 | 3.8 | Building details → laundry rooms |

## Root causes

1. **`PageShell` `flexGrow: 1`** — Scroll content stretched to viewport height, leaving empty `#F8FAFB` gray below short pages (Waschküchen) and below pinned footers.
2. **Building selector opacity pulse** — `fadeAnim` 0.55→1 on every `building.id` change caused visible flicker.
3. **Dashboard full-screen `LoadingState`** — Settings fetch replaced entire management section with spinner; building refetch blanked whole dashboard.
4. **Registration double navigation** — `router.replace` + `<Redirect>` both fired after join, causing transition flash.

## Fixes applied

- `ui.tsx`: Remove `flexGrow: 1`; pin footer outside ScrollView for footer pages.
- `BuildingSelector.tsx`: Remove fade animation and layout animation on select.
- `dashboard.tsx`: Initial-load-only spinner; inline settings placeholder instead of full `LoadingState`.
- `join/[token].tsx`: Single redirect via auth state; correct tabs route.
- `NoticePopupModal.tsx`: Reset notice index when modal opens.
