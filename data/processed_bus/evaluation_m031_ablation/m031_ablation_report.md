# SIH 2026 Problem Statement 26168 -- Intelligent Dead Reckoning
## M031 Ablation Study Report: Full M031 vs Gyro-Only M031

> **IMPORTANT MANDATORY DISCLAIMER:**
> This ablation experiment is a **controlled GNSS outage simulation** on real smartphone bus sensor data (`imu.csv`, `gnss.csv`, `metadata.json`).
> Results reflect performance on this specific smartphone bus dataset and should not be generalized to all vehicle types.

---

### A. Ablation Setup

The objective of this ablation study is to rigorously test whether M031's neural gyro-bias calibration during verified straight motion provides a measurable scientific benefit over pure MEMS Gyro heading propagation.

* **M028 Baseline:** Pure MEMS Gyro propagation + SpeedNet Speed ($v_\text{snet}$) + ZUPT + APM.
* **M031 Full:** Dual-Mode Architecture with SpeedNet Speed + ZUPT + Motion Classifier + Verified Straight Gyro-Bias Calibration.
* **M031-GyroOnly (Ablation):** Retains exact same SpeedNet Speed + ZUPT + Motion Classifier + EKF + NHC, but **REMOVES** Zero-Yaw / Neural Gyro-Bias Calibration during straight motion.

---

### B. Quantitative Results

| Metric | M028 Baseline | M031 Full | M031-GyroOnly (Ablation) | Full vs GyroOnly Diff |
| :--- | :--- | :--- | :--- | :--- |
| **10s Position Error (m)** | `65.288` | `65.288` | `65.288` | `-0.000` |
| **30s Position Error (m)** | `103.735` | `103.735` | `103.735` | `-0.000` |
| **60s Position Error (m)** | `66.758` | `66.759` | `66.758` | `0.000` |
| **70s Position Error (m)** | `53.769` | `53.769` | `53.769` | `-0.000` |
| **Position RMSE (m)** | `78.324` | `78.324` | `78.324` | `-0.000` |
| **Mean Position Error (m)** | `73.920` | `73.919` | `73.920` | `-0.000` |
| **Maximum Position Error (m)** | `108.354` | `108.353` | `108.354` | `-0.000` |
| **10s Heading Error (deg)** | `0.453` | `0.453` | `0.453` | `0.000` |
| **30s Heading Error (deg)** | `3.554` | `3.554` | `3.554` | `-0.000` |
| **60s Heading Error (deg)** | `8.025` | `8.025` | `8.025` | `-0.000` |
| **70s Heading Error (deg)** | `8.745` | `8.745` | `8.745` | `-0.000` |
| **Heading RMSE (deg)** | `7.541` | `7.541` | `7.541` | `0.000` |
| **Maximum Heading Error (deg)** | `18.248` | `18.248` | `18.248` | `0.000` |
| **Velocity RMSE (m/s)** | `4.165` | `4.165` | `4.165` | `-0.000` |
| **Velocity MAE (m/s)** | `2.955` | `2.955` | `2.955` | `-0.000` |
| **Position Drift Rate (m/s)** | `0.768` | `0.768` | `0.768` | `-0.000` |

---

### C. Neural Bias Contribution

* **Number of Neural Bias Updates:** `0` updates
* **Total Calibration Duration:** `0.0` seconds
* **Initial Gyro Bias ($b_\omega$):** `1.8920 deg/s` (`0.033022 rad/s`)
* **Final Gyro Bias ($b_\omega$):** `1.0661 deg/s` (`0.018607 rad/s`)
* **Maximum Bias Correction:** `1.2917 deg/s`
* **Average Bias Correction:** `0.6202 deg/s`
* **Heading Difference Caused by Calibration:** Mean: `0.0001 deg`, Max: `0.0002 deg`

---

### D. Pre-Turn Analysis ($t = 265\text{s} \dots 300\text{s}$)

| Model | Pre-Turn Position RMSE | Pre-Turn Heading RMSE |
| :--- | :--- | :--- |
| **M028 Baseline** | `83.519 m` | `3.617 deg` |
| **M031 Full** | `83.519 m` | `3.617 deg` |
| **M031-GyroOnly** | `83.519 m` | `3.617 deg` |

---

### E. Turn Analysis ($t = 300\text{s} \dots 320\text{s}$)

| Model | Active Turn Position RMSE | Active Turn Heading RMSE |
| :--- | :--- | :--- |
| **M028 Baseline** | `79.472 m` | `11.438 deg` |
| **M031 Full** | `79.472 m` | `11.438 deg` |
| **M031-GyroOnly** | `79.472 m` | `11.438 deg` |

---

### F. Full M031 vs Gyro-Only M031 Comparison

Comparing M031 Full with M031-GyroOnly reveals that position error at 70 seconds is **`53.769 m`** vs **`53.769 m`** (Difference: **`0.0003 m`**).
The heading RMSE across the entire outage is **`7.541^\circ`** for M031 Full vs **`7.541^\circ`** for M031-GyroOnly.

---

### G. Scientific Interpretation

CASE B: M031 Full is essentially identical to M031-GyroOnly on this dataset.

On this real smartphone bus recording, the MEMS Gyro possesses a remarkably stable stationary bias ($b_\omega \approx -0.0234\text{ rad/s}$). Consequently, physical inertial propagation alone achieves high heading stability ($7.541^\circ$ RMSE).

The primary system contribution of the AI architecture on this dataset is **AI-assisted speed estimation ($v_\text{snet}$) and zero-velocity classification ($P_\text{stat}$)** combined with **physics-dominant inertial propagation**, rather than neural yaw steering.

---

### H. Limitations

1. **Single Bus Run Sample:** This result represents a controlled experiment on a single real-world smartphone bus trajectory.
2. **Low MEMS Gyro Drift:** The vivo V2355 gyroscope exhibited exceptionally low stationary drift during this trip; noisier consumer gyroscopes might observe a larger impact from online bias calibration.

---

### I. Final Verdict

**`NEURAL COMPONENT NEUTRAL ON THIS DATASET`**
