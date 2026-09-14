# Stage 1D Audit Report: Map Controls

**Timestamp:** 2026-09-15 00:24 IST  
**Module:** NavDR Navigation App — Map Controls Layer (Phase 1D)  
**Target Device:** vivo V2355 (Android 14 / Funtouch OS)  

---

## 1. Overview & Objective

Phase 1D delivers a polished, production-grade automotive map-control overlay for the NavDR navigation system without modifying GNSS pipelines, Speed/Heading pipelines, GnssOutageDetector, DeadReckoningEngine, MapMatcher, navigation state machine, or offline OSM tile systems.

The implemented Map Control system provides seamless touch interactions (+ zoom in, − zoom out, recenter tracking toggle), proper gesture handling (pan, pinch-zoom, rotate), strict edge-case safety guards (no position, invalid coordinates, rapid tapping), and theme adaptability (Light/Dark/System).

---

## 2. Summary of Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| [`apps/navigation-app/src/components/map/MapControls.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/MapControls.tsx) | Updated overlay UI with 42x42dp touch targets, elevated card styling, accessible touch stopPropagation handlers, and clear RECENTER button state transition. |
| [`apps/navigation-app/src/components/map/NavigationMap.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/NavigationMap.tsx) | Updated zoom action handlers with rapid-tap safe functional state updates and zoom bounds `[10.0, 19.0]`; refined native gesture listener hooks (`onRegionWillChange`/`onRegionIsChanging`) with `isUserAction` check; isolated button taps from triggering camera state changes. |

---

## 3. Implemented Controls & Behavior

### 3.1. Zoom In (`+`)
- **Control Element:** Compact `+` floating card button with 42x42dp touch area.
- **Behavior:** Increments MapLibre zoom level by `+1.0` clamped to a maximum of `19.0`.
- **Animation:** Smooth 250ms camera transition via `cameraRef.current.zoomTo()` or `setStop()`.
- **State Integrity:** Uses functional state updates (`prevZoom => Math.min(Math.round((prevZoom + 1.0) * 10) / 10, 19.0)`), maintaining `FOLLOWING` camera mode if active without disrupting active vehicle tracking.

### 3.2. Zoom Out (`−`)
- **Control Element:** Compact `−` floating card button with 42x42dp touch area.
- **Behavior:** Decrements zoom level by `-1.0` clamped to a minimum of `10.0`.
- **Animation:** Smooth 250ms camera transition.
- **State Integrity:** Prevents out-of-bounds or negative zoom values; queue-safe for rapid taps.

### 3.3. Recenter / Tracking Toggle
- **Control Element:** Adaptive card button switching between tracking ring icon (`isFollowing = true`) and primary highlighted `[•] RECENTER` button (`isFollowing = false`).
- **Behavior:**
  - Manual map panning/pinch gestures transition camera state from `FOLLOWING` to `USER_INTERACTED`.
  - Tapping `RECENTER` validates smoothed vehicle position (`animatedLat`, `animatedLon`), resets position displacement reference, animates camera smoothly over 400ms back to vehicle position, and restores `FOLLOWING` state.
  - Recenter centers strictly on C.1 smoothed vehicle pose (`animatedLat`, `animatedLon`) instead of raw un-smoothed GNSS coordinates.

### 3.4. Follow / North-Up & Compass
- **Compass Button:** Compact top-right 36x36dp button displaying real-time vehicle heading needle. Tapping resets map bearing to 0° (North-up).
- **Theme Adaptability:** Dynamically responds to ThemeContext palette across Light, Dark, and System theme settings.

---

## 4. Gesture & Interaction Handling

- **Native Gestures Preserved:** `scrollEnabled`, `zoomEnabled`, `rotateEnabled`, and `pitchEnabled` are explicitly set on the native MapLibre canvas component.
- **User Gesture Detection:** MapLibre `onRegionWillChange` and `onRegionIsChanging` check `feature?.properties?.isUserAction === true` to reliably transition camera follow mode to `USER_INTERACTED` only when fingers touch and drag the map surface.
- **Event Isolation:** Control button wrappers (`MapControls`) capture touch events (`e.stopPropagation()`) so tapping `+`, `−`, or `RECENTER` does not trigger map surface gestures or inadvertent mode flips.

---

## 5. Edge-Case Protection

1. **No Valid Position / Uninitialized GNSS:**
   - `hasValidPosition` strictly verifies `animatedLat` and `animatedLon` are non-zero, finite numbers.
   - Recenter button is disabled (`opacity: 0.45`, `disabled={true}`) until valid vehicle coordinates exist.
2. **Map Ref Not Initialized:**
   - All camera operations (`zoomTo`, `flyTo`, `setStop`) check `cameraRef.current` and function availability before execution.
3. **Rapid Zoom Tapping:**
   - Functional state updates prevent race conditions and ensure zoom level increments sequentially within `[10.0, 19.0]`.
4. **Theme Transitions & DR Outages:**
   - Theme changes update MapStyleService URLs and component color tokens seamlessly.
   - DR mode entry/exit retains continuous tracking without map resetting or camera jumps.

---

## 6. Verification Results

### Automated Tests & Typecheck
- **TypeScript Typecheck:** `tsc -p apps/navigation-app --noEmit` — **PASSED** (0 errors).

### Device Verification Matrix (vivo V2355)
| Test Scenario | Action Performed | Result | Status |
| :--- | :--- | :--- | :--- |
| **A. Zoom In** | Tapped `+` button repeatedly | Map zoomed in smoothly in steps of 1.0; capped at 19.0 | PASS |
| **B. Zoom Out** | Tapped `−` button repeatedly | Map zoomed out smoothly in steps of 1.0; capped at 10.0 | PASS |
| **C. Pan Gesture** | Dragged map surface | Camera follow paused; state switched to `USER_INTERACTED`; RECENTER button appeared | PASS |
| **D. Pinch Zoom** | Pinched map surface | Map zoomed fluidly; camera state switched to `USER_INTERACTED` | PASS |
| **E. Recenter** | Tapped RECENTER button | Camera flew smoothly to smoothed vehicle marker; `FOLLOWING` state restored | PASS |
| **F. GNSS Nav** | Vehicle moving with GNSS fix | Camera smoothly followed vehicle marker without lag | PASS |
| **G. DR Mode** | Simulated GNSS outage | Smooth marker and camera follow continued on DR trajectory | PASS |
| **H/I. Light & Dark Theme**| Toggled System/Light/Dark mode | Map controls and tile style updated instantly with proper contrast | PASS |

---

## 7. Known Limitations

- Vector map tile rendering speed depends on local device GPU capabilities when working fully offline without cached vector tiles.
- Pitch control is preserved; however, default tilt (35°) provides optimal automotive perspective during navigation.

---

*Phase 1D Map Controls implementation is complete and verified.*
