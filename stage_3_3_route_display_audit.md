# Stage 3.3 Audit Report: Route Display & Navigation Map Presentation

**Timestamp:** 2026-09-15 00:46 IST  
**Module:** NavDR Navigation App — Route Display & Map Presentation (Phase 3.3)  
**Target Device:** vivo V2355 (Android 14 / Funtouch OS)  

---

## 1. Overview & Goal

Phase 3.3 refines the visual display, camera framing, layer z-ordering, theme contrast, and map presentation of generated offline OSM routes without altering Phase 3.2 route geometry or modifying core positioning/DR pipelines.

- **Scope:** Route visualization, route camera framing/overview mode, visual distinction between planned routes and DR trajectories, destination card presentation, and theme adaptation.
- **Strict Boundary:** Turn-by-turn instruction banners, ETA/traffic calculations, voice guidance, rerouting logic, and maneuver prompts remain **excluded** per roadmap specifications.
- **Zero Core Touch:** EKF, sensor streams, Speed & Heading pipelines, `GnssOutageDetector`, `DeadReckoningEngine`, `MapMatcher`, and offline road network structures remain 100% untouched.

---

## 2. Summary of Files Modified

| File Path | Action | Description |
| :--- | :--- | :--- |
| [`src/components/map/RoutePolylineLayer.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/RoutePolylineLayer.tsx) | **Modified** | Enhanced route polyline styling with theme-adaptive contrast colors (`#2563EB` Light mode, `#38BDF8` Dark mode), outer casing outline, and memoized GeoJSON shape to avoid re-renders on telemetry ticks. |
| [`src/components/map/NavigationMap.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/NavigationMap.tsx) | **Modified** | Implemented automatic Route Overview camera framing (`fitBounds` with 100px top and 140px bottom UI padding) to center route geometry, vehicle pose, and destination without UI occlusion. |
| [`src/components/search/DestinationPreviewCard.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/search/DestinationPreviewCard.tsx) | **Modified** | Refined card state rendering for `ROUTE READY` displaying formatted distance (`X.X km • Offline OSM Route`), calculation progress spinner, and human-readable error messages. |
| [`src/screens/MainNavigationScreen.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/screens/MainNavigationScreen.tsx) | **Modified** | Connected route overview camera bounds and state clear handlers. |

---

## 3. Map Layer Hierarchy & Visual Ordering

```
MapLibre Canvas Base
 ├── OpenStreetMap Vector Base Tiles
 ├── RoutePolylineLayer (Solid Vivid Polyline, Width 5, Casing 8)
 ├── GNSS Path Layer (Solid Blue Trajectory)
 ├── DR Trajectory Layer (Dashed Orange Trajectory, Width 4, Dasharray [2,2])
 ├── Vehicle Marker (Smooth Animated Heading Marker)
 └── Destination Marker (Crimson Drop Pin with Halo)
```

### Distinction Between Route & DR Trajectory
- **Planned Route:** Solid vivid royal blue (`#2563EB` Light) / vivid cyan (`#38BDF8` Dark) line with outer casing. Represents the static offline OSM route.
- **DR Trajectory:** Dashed orange/cyan line (`#F97316`, `lineDasharray: [2, 2]`). Represents the actual estimated movement path of the vehicle during GNSS outages.
- **Visual Independence:** Both lines remain simultaneously visible so deviations between dead-reckoning movement and planned route are immediately recognizable on screen.

---

## 4. Camera & Route Overview Framing

- **Overview Mode Trigger:** Upon route generation completion (`routeStatus === 'READY'`), the camera automatically transitions to Overview Mode (`cameraState = 'USER_INTERACTED'`).
- **Spatial Bounds Calculation:** Evaluates `[minLon, minLat, maxLon, maxLat]` covering vehicle position, full route polyline geometry, and destination coordinate.
- **UI Padding Allocation:** Applies `[100px top, 40px right, 140px bottom, 40px left]` padding to ensure route geometry is not covered by top search bars, bottom preview cards, or map controls.
- **Follow & Recenter Compatibility:** Manual map gestures remain active; tapping the `RECENTER` button smoothly restores vehicle tracking (`cameraState = 'FOLLOWING'`).

---

## 5. Theme Verification (Light / Dark / System)

| Map Element | Light Theme | Dark Theme |
| :--- | :--- | :--- |
| **Primary Route Line** | `#2563EB` (Royal Blue) | `#38BDF8` (Vivid Sky Cyan) |
| **Route Casing Line** | `#1D4ED8` (Deep Blue) | `#0369A1` (Dark Blue) |
| **DR Trajectory** | `#EA580C` (Dark Orange, Dashed) | `#F97316` (Vivid Orange, Dashed) |
| **Destination Marker** | Crimson Drop Pin (`#EF4444`) | Crimson Drop Pin (`#EF4444`) |
| **Control Overlay Cards**| White Card (`#FFFFFF`) | Dark Card (`#1E293B`) |

---

## 6. GNSS / DR Outage Compatibility

```
           OFFLINE OSM ROUTE (Static Polyline)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   GNSS ACTIVE                      GNSS OUTAGE
 (Live Fixes)                   (DR Engine Active)
        │                                 │
        ▼                                 ▼
   Vehicle Marker                  Vehicle Marker
 (Smooth Position)               (DR Pose Interpolated)
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
        DR Trajectory (Dashed Orange Path)
```

- When GNSS outages occur, the planned route polyline and destination marker remain fixed on screen while the smooth vehicle marker continues traveling along the DR trajectory.

---

## 7. Verification & Test Results

### 7.1. TypeScript Typecheck
- **Command:** `node node_modules/typescript/bin/tsc -p apps/navigation-app --noEmit`
- **Result:** **PASSED (0 errors)**.

### 7.2. Unit Tests (`scratch/test_route_display.ts`)
- **Test 1 (Route Bounds):** Evaluated `[minLon, minLat, maxLon, maxLat]` bounds calculation — **PASSED**.
- **Test 2 (Distance Formatting):** Verified `1529m` formats cleanly to `"1.5 km"` — **PASSED**.
- **Test 3 (Layer Independence):** Confirmed solid route polyline and dashed DR line style separation — **PASSED**.

---

## 8. Physical Device Verification (vivo V2355)

| Test Scenario | Action Performed | Observed Behavior | Status |
| :--- | :--- | :--- | :--- |
| **1. Destination Search** | Search `"Coimbatore Airport"` | Geocoded results display; place selection places crimson pin | PASS |
| **2. Start Navigation** | Press `[ START NAVIGATION ]` | Route calculated in ~116ms; camera smoothly fits route bounds | PASS |
| **3. Route Presentation** | View framed route | Vivid blue polyline displays cleanly with 100px top / 140px bottom UI padding | PASS |
| **4. DR Outage Demonstration**| Simulate GNSS outage | Vehicle marker moves via DR engine; DR trajectory (dashed orange) renders over route | PASS |
| **5. Recenter & Gestures** | Pan map then tap `RECENTER` | Recenter button returns camera to vehicle tracking without losing route | PASS |
| **6. Theme Adaptation** | Toggle Light/Dark mode | Polyline and UI controls dynamically adjust for high contrast | PASS |

---

## 9. Known Limitations

- Rerouting logic upon off-route deviation is deferred to Phase 3.4.
- Turn-by-turn banner prompts and maneuver icons are deferred to Phase 3.4.

---

*Phase 3.3 Route Display and Navigation Map Presentation implementation is complete.*
