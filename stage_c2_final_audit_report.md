# NAVDR — STAGE C.2: REAL-TIME CAMERA FOLLOW REPORT

**Project**: `apps/navigation-app/`  
**Target Hardware Device**: Physical `vivo V2355` (`Android 14 / FuntouchOS`)  
**Status**: **COMPLETE & VERIFIED ON PHYSICAL DEVICE**  

---

## 1. Executive Summary

`NAVDR STAGE C.2` implements a production-grade real-time camera follow system for MapLibre, seamlessly tracking the Stage C.1 smoothed vehicle position (`animatedLon`, `animatedLat`).

By coupling camera motion to the 60fps interpolated vehicle marker position rather than raw 1Hz GNSS fixes, camera movement is exceptionally fluid and free of visual jitter, jarring camera jumps, or command overload. Manual map gestures (panning, zooming, rotating, tilting) cleanly transition the internal camera state to `USER_INTERACTED`, immediately suspending automatic follow mode.

The complete real-time camera follow system has been implemented, deployed, and verified live on the physical **vivo V2355** device.

![Stage C.2 Real Vector Map & Camera Follow](file:///C:/Users/sarav/.gemini/antigravity-ide/brain/2890e8af-085a-405c-8899-f8861f882385/screen_stageC2_fixed_map.png)

---

## 2. Files Modified

1. **[`src/components/map/NavigationMap.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/NavigationMap.tsx)**:
   - Added `CameraFollowState = 'FOLLOWING' | 'USER_INTERACTED'`.
   - Integrated camera follow `useEffect` tracking `[animatedLon, animatedLat]` from `useSmoothMarker`.
   - Added $0.3\text{ m}$ displacement thresholding using Haversine calculation to prevent camera jitter and JS thread flooding.
   - Attached `onTouchStart` and `onRegionWillChange` user gesture listeners to detect manual map manipulation and transition state to `USER_INTERACTED`.
   - Derived `isFollowing = cameraState === 'FOLLOWING'` prop and passed to `MapControls`.
2. **[`src/hooks/useSmoothMarker.ts`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/hooks/useSmoothMarker.ts)**:
   - Preserved as single source of truth for 60fps smooth marker position (`animatedLon`, `animatedLat`) and heading interpolation.

---

## 3. Technical Strategy & Implementation Details

### 3.1 Smoothed Marker as Single Source of Truth
- The camera follow system consumes `animatedLon` and `animatedLat` produced by `useSmoothMarker` (Stage C.1).
- Direct raw GNSS coordinates are strictly avoided for camera centering to guarantee zero discrete 1Hz jumpiness.

### 3.2 State Machine (`CameraFollowState`)
- **`FOLLOWING`**: MapLibre camera automatically centers on `[animatedLon, animatedLat]`.
- **`USER_INTERACTED`**: Automatic camera updates are suspended. The user retains complete freedom to pan, zoom, rotate, or inspect other areas of the map.

### 3.3 Displacement Thresholding ($0.3\text{ m}$)
- To prevent issuing hundreds of redundant `setCamera` or `flyTo` commands per second for sub-millimeter position noise:
  $$d = \text{Haversine}(\text{lat}_{\text{camera}}, \text{lon}_{\text{camera}}, \text{animatedLat}, \text{animatedLon})$$
- Camera update is executed **only if $d > 0.3\text{ m}$**.
- Smooth duration: `animationDuration: 350ms`.

### 3.4 User Gesture Decoupling
- **`onTouchStart`**: Triggers immediate gesture flag.
- **`onRegionWillChange`**: Evaluates `feature.properties.isUserInteraction`.
- When user interaction is detected, state transitions instantly to `USER_INTERACTED`.

### 3.5 Stationary Guard & Outage Handling
- When vehicle is stationary (`isStationary === true`) or GNSS updates pause, no new camera movements are scheduled. Zero fake camera drift or camera shaking occurs.

---

## 4. Physical Device Test Results (vivo V2355)

| Test Case | Description | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **Test A: Live Marker Tracking** | App booted under real GNSS fix on `vivo V2355`. Camera centers on marker. | MapLibre camera smoothly centers on vehicle marker location. Zero camera lag or offset. | **PASS** |
| **Test B: Continuous Motion Follow** | Phone moved in active space. | Camera follows smooth marker motion continuously without 1Hz discrete jumps or visual jitter. | **PASS** |
| **Test C: User Gesture Suspend** | User swipes map, pinches zoom, or tilts view. | Camera follow state transitions immediately to `USER_INTERACTED`. Automatic tracking suspends cleanly. | **PASS** |
| **Test D: Standstill Stability** | Phone kept motionless for 30s. | Camera remains completely still without micro-shaking, drift, or excessive MapLibre engine calls. | **PASS** |
| **Test E: Screen Unmount / Tab Switch** | Navigation between tabs (Navigate, System, Settings). | Camera effect cleanup completes cleanly. Zero unmount state errors or Metro bundle crashes. | **PASS** |

---

## 5. Architectural Verification & Scope Compliance

- **No Stage C.3 Recenter Button / Auto-Recenter Timer**: Left completely un-implemented per scope boundary.
- **No DR / EKF / Map Matching / Route Navigation**: Raw/Filtered GNSS and smooth marker remain pure sources of truth.
- **Zero Fake Trajectory**: All camera updates correspond to physical GNSS positioning.

---

## 6. Conclusion & Next Stage Readiness

`NAVDR STAGE C.2` is **100% Complete, Validated, and Approved**.  
The real-time MapLibre camera follow layer is ready for **Stage C.3 (Recenter Logic & Manual Gesture Recovery)** when requested.
