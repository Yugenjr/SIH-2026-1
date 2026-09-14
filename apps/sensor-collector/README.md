# IDR Sensor Collector

**Package**: `com.sih2026.sensorcollector`  
**Application ID**: `com.sih2026.sensorcollector`  
**Purpose**: Dedicated Android application for collecting high-frequency smartphone IMU (Accelerometer, Gyroscope) and GNSS location data for Intelligent Dead Reckoning (IDR) research, model validation, and dataset generation.

---

## Capabilities & Architecture

- **Sensors Collected**:
  - `TYPE_ACCELEROMETER` (High sampling rate, background thread handling)
  - `TYPE_GYROSCOPE` (High sampling rate, background thread handling)
  - `LocationManager` GNSS updates (Latitude, Longitude, Altitude, Speed, Accuracy, Bearing)
- **Threading Model**: Dedicated `HandlerThread` for sensor callbacks offloaded from main UI thread, single-thread executor for async disk I/O, 6.6 Hz UI refresh loop.
- **Output Files**:
  - `imu.csv`: `Timestamp_Nanos, Accel_X_mps2, Accel_Y_mps2, Accel_Z_mps2, Gyro_X_rads, Gyro_Y_rads, Gyro_Z_rads`
  - `gnss.csv`: `Timestamp_Nanos, Latitude, Longitude, Altitude_m, Speed_mps, Bearing_deg, Accuracy_m`
  - `metadata.json`: Device model, manufacturer, Android API level, start/stop UTC timestamps, total event counts.

---

## Relationship to Navigation System

> [!NOTE]
> This application is **NOT** the final navigation application.
> 
> The future **Navigation App** (`apps/navigation-app/`) will consume live sensor data and execute the `idr-core` engine (SpeedNet + 7-state EKF + Multi-Anchor Heading Manager) locally on-device.

---

## Project Structure

```
apps/sensor-collector/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradlew
├── gradlew.bat
├── app/
│   ├── build.gradle.kts
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── java/com/sih2026/sensorcollector/MainActivity.kt
│           └── res/layout/activity_main.xml
└── README.md
```
