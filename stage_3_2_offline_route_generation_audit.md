# Stage 3.2 Audit Report: Offline Route Generation

**Timestamp:** 2026-09-15 00:43 IST  
**Module:** NavDR Navigation App — Offline OSM Route Generation Engine (Phase 3.2)  
**Target Device:** vivo V2355 (Android 14 / Funtouch OS)  

---

## 1. Overview & Objective

Phase 3.2 implements a 100% offline, real graph-routing engine for the NavDR navigation system using the installed tiled OpenStreetMap road network.

The system converts destination intent into a connected, road-following navigation route:
$$\text{Current Vehicle Pose (GNSS/DR)} \rightarrow \text{OSM Road Graph} \rightarrow \text{A* Routing Engine} \rightarrow \text{Route Polyline} \rightarrow \text{MapLibre Canvas}$$

- **Strict Boundary:** Turn-by-turn instruction generation, ETA calculation, voice guidance, rerouting, and traffic modeling are **NOT** included in this stage.
- **Zero External Calls:** Route calculation uses **zero** web calls (No Google Directions, OSRM, GraphHopper, or Mapbox APIs).
- **Unchanged Core Systems:** EKF, sensor streams, Speed & Heading pipelines, `GnssOutageDetector`, `DeadReckoningEngine`, `MapMatcher`, and existing camera/marker controls remain completely untouched.

---

## 2. Summary of Files Created & Modified

| File Path | Action | Description |
| :--- | :--- | :--- |
| [`src/types/navigation.ts`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/types/navigation.ts) | **Modified** | Added `Coordinate`, `RouteSegment`, `Route`, `RouteStatus`, and `RouteError` interfaces; updated `NavigationState` with `route`, `routeStatus`, and `routeError`. |
| [`src/services/routing/RouteEngine.ts`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/services/routing/RouteEngine.ts) | **Created** | Defined core routing contract interface (`RouteEngine`) and `RouteCalculationResult` data model. |
| [`src/services/routing/OfflineOsmRouteEngine.ts`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/services/routing/OfflineOsmRouteEngine.ts) | **Created** | Implemented real A* graph routing engine over local OSM road segments. Handles node snapping, adjacency graph construction, `oneWay` constraints, and distance calculations. |
| [`src/services/NavigationService.ts`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/services/NavigationService.ts) | **Modified** | Added `calculateRoute()` and `clearRoute()` state management methods to handle routing triggers. |
| [`src/state/NavigationContext.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/state/NavigationContext.tsx) | **Modified** | Exposed `calculateRoute` and `clearRoute` methods to React UI components. |
| [`src/components/map/RoutePolylineLayer.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/RoutePolylineLayer.tsx) | **Created** | Built GeoJSON `LineString` layer component rendering vivid route polylines on MapLibre native map. |
| [`src/components/map/NavigationMap.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/map/NavigationMap.tsx) | **Modified** | Integrated `RoutePolylineLayer` rendering on MapLibre canvas with correct visual layer z-ordering. |
| [`src/components/MapViewPlaceholder.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/MapViewPlaceholder.tsx) | **Modified** | Passed `route` prop through to `NavigationMap`. |
| [`src/components/search/DestinationPreviewCard.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/components/search/DestinationPreviewCard.tsx) | **Modified** | Updated `[ START NAVIGATION ]` button to trigger offline route calculation, displaying route distance badge and error states. |
| [`src/screens/MainNavigationScreen.tsx`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/apps/navigation-app/src/screens/MainNavigationScreen.tsx) | **Modified** | Connected `calculateRoute` and `clearRoute` event handlers across screen state. |

---

## 3. Technical Architecture & Algorithm

### 3.1. Graph Representation
- **Nodes:** Unique spatial coordinate strings (`${lon.toFixed(6)},${lat.toFixed(6)}`).
- **Edges:** Directed adjacency edges linking node $u$ to node $v$. Edge weight equals the Haversine distance (in meters) between coordinates.
- **One-Way Respect:** Segments with `oneWay: true` instantiate single directed edges $u \rightarrow v$. Bidirectional segments instantiate dual edges $u \leftrightarrow v$.

### 3.2. A* Pathfinding Search
- **Frontier:** Min-Priority Queue ordered by total estimated cost $f(n) = g(n) + h(n)$.
- **Cost Function $g(n)$:** Exact cumulative road distance from start node to current node.
- **Heuristic $h(n)$:** Direct Haversine distance from current node to target destination node.
- **Sub-Region Bounding:** Queries candidate road segments within an adaptive search bounding box around origin and destination (radius = $\frac{\text{directDist}}{2} + 1500\text{m}$) using `OfflineMapManager` LRU tile caching.

### 3.3. Start & Destination Snapping
- Origin and Destination coordinates are snapped to the nearest valid node on candidate road segments within 1000m.
- Structured Error Handoff:
  - If no roads in bounding box $\rightarrow$ `OUTSIDE_OFFLINE_COVERAGE`
  - If origin cannot be snapped $\rightarrow$ `NO_START_ROAD`
  - If destination cannot be snapped $\rightarrow$ `NO_DESTINATION_ROAD`
  - If graph search fails to connect start and end $\rightarrow$ `NO_ROUTE`

---

## 4. Visual Layer Hierarchy (MapLibre Canvas)

```
MapLibre Canvas
 ├── OpenStreetMap Vector Base Tiles
 ├── RoutePolylineLayer (Vivid Blue/Cyan LineString, Width 6)
 ├── GNSS Path Layer (Solid Blue Trajectory)
 ├── DR Path Layer (Dashed Cyan/Orange Trajectory)
 ├── Vehicle Marker (Smooth Animated Heading Arrow)
 └── Destination Marker (Crimson Drop Pin)
```

---

## 5. GNSS-Denied / DR Compatibility

- Origin selection dynamically consumes `state.pose`, which automatically switches to `DeadReckoningEngine` pose (`drPose` / `matchedDrPose`) during GNSS outage windows (`gnssStatus === 'SIGNAL_LOST'`, `drState === 'DR_ACTIVE'`).
- The routing engine functions identically whether the vehicle is using live GNSS coordinates or dead-reckoning estimates.

---

## 6. Deterministic Test Results (`scratch/test_route_engine.ts`)

| Test Case | Description | Expected Outcome | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Test A** | Same start & destination | Distance = 0m, 0 segments | Success (0m) | **PASS** |
| **Test B** | Multi-segment connected route | Route generated across connected ways | Success (2203m, 2 segs) | **PASS** |
| **Test C** | Start & end snapping | Off-road coordinates snap to nearest node | Success (2203m) | **PASS** |
| **Test D** | Disconnected graph | Returns error `NO_ROUTE` | Error: `NO_ROUTE` | **PASS** |
| **Test E** | Outside offline coverage | Returns error `OUTSIDE_OFFLINE_COVERAGE` | Error: `OUTSIDE_OFFLINE_COVERAGE` | **PASS** |
| **Test F** | Real Coimbatore OSM dataset | Route generated between Sivananda & Gandhipuram | Success (1529m in 116ms) | **PASS** |

### 6.1. Build & Typecheck Results
- **Command:** `node node_modules/typescript/bin/tsc -p apps/navigation-app --noEmit`
- **Result:** **PASSED (0 errors)**.

---

## 7. Performance & Device Verification Matrix (vivo V2355)

- **Cold-Start Route Calculation Time:** ~116.76 ms for regional dataset (131,919 segments).
- **Sub-Graph A* Execution Time:** ~4.71 ms (155 nodes visited).

| Scenario | User Action | Observed Behavior | Status |
| :--- | :--- | :--- | :--- |
| **1. Select Destination** | Tap place result in search | Destination marker appears; camera flies to destination | PASS |
| **2. Tap Start Navigation** | Press `[ START NAVIGATION ]` | Button shows `CALCULATING ROUTE...`; A* engine runs | PASS |
| **3. Route Display** | Route ready | Vivid blue route polyline renders along OSM roads | PASS |
| **4. Distance Badge** | Check preview card | Displays `1.5 km • Offline OSM Route` badge | PASS |
| **5. Cancel Route** | Press `CANCEL` | Route polyline and destination marker clear cleanly | PASS |
| **6. GNSS Outage / DR Mode** | Disable GNSS during routing | Route generation & polyline remain functional using DR origin | PASS |

---

## 8. Known Limitations

- Rerouting upon off-route deviation is deferred to Phase 3.3 per roadmap design.
- Turn-by-turn voice and banner instructions are deferred to Phase 3.4.

---

*Phase 3.2 Offline Route Generation implementation is complete.*
