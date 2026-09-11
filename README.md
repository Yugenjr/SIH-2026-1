# SIH 2026 Problem Statement 26168: AI-ML Based Intelligent Dead Reckoning System

[![SIH 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://sih.gov.in)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-ee4c2c.svg)](https://pytorch.org/)
[![Status](https://img.shields.io/badge/Production%20Status-M028%20Locked-orange.svg)](milestones/M028_imu_jerk_apm.md)

This repository presents our complete, production-ready solution for **Smart India Hackathon (SIH) 2026 Problem Statement 26168**: *"AI-ML based Intelligent Dead Reckoning system for seamless navigation"*.

The system provides autonomous, continuous, high-precision vehicle navigation during total GNSS outages (tunnels, urban canyons, dense forest canopies, deep valleys, and jamming events) by fusing low-cost IMU telemetry with a multi-task deep neural network (**SpeedNet v2**), a 7-State Extended Kalman Filter (EKF), non-holonomic constraints (NHC), and a novel **Causal IMU Jerk-Gated Adaptive Position/Velocity Correction Mechanism (APM)**.

---

## 🏆 Key System Performance & SIH Compliance

Our production system (**M028 Baseline**) exceeds all SIH 2026 evaluation requirements on unseen real-world vehicle test datasets:

| Outage Scenario / Distance | SIH 2026 Target Requirement | Measured System Performance | Compliance Status |
|---|---|---|---|
| **60-Second GNSS Outage** | $< 50.00\text{ meters}$ | **24.16 meters** | **PASSED (206.9% Margin)** |
| **1-Kilometer Continuous Outage** | $< 500.00\text{ meters}$ | **260.35 meters** | **PASSED (192.0% Margin)** |
| **120-Second GNSS Outage** | N/A (Diagnostic) | **402.82 meters** | **OPERATIONAL** |
| **300-Second (5-Min) Outage** | N/A (Diagnostic) | **247.67 meters** | **OPERATIONAL** |

---

## 📐 Production Architecture (M028 Pipeline)

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 RAW IMU TELEMETRY (100 Hz)             │
                  │       Accelerometer (ax, ay, az) & Gyro (gx, gy, gz)   │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
     ┌───────────────────────────────┐                 ┌───────────────────────────────┐
     │         SpeedNet v2           │                 │       Gyro Integration        │
     │   (CNN + BiLSTM, Window=40)   │                 │       Causal Yaw Angle        │
     └───────────────┬───────────────┘                 └───────────────┬───────────────┘
                     │                                                 │
                     │ Forward Speed v_net                             │ Yaw Angle ψ
                     └────────────────────────┬────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │   7-State ENU Extended KF    │
                               │  (Fixed 2D NHC, R_nhc=0.04)   │
                               └──────────────┬───────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │     IMU Jerk-Gated APM       │
                               │   j_long < -1.00 m/s³ Gate   │
                               └──────────────┬───────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │  CANONICAL NAVIGATION OUTPUT │
                               │  60s: 24.16m | 1km: 260.35m   │
                               └──────────────────────────────┘
```

### Core Technological Innovations

1. **SpeedNet v2 (Multi-Task Neural Speed Engine)**:
   - 1D-CNN temporal feature extractor paired with a Bidirectional LSTM ($W=40$ sliding window).
   - Simultaneously predicts continuous forward speed $v_{\text{net}}$, vehicle yaw rate $\omega_{\text{yaw}}$, stationary probability $P(\text{stat})$, and short-term $\Delta v$.
2. **7-State ENU Extended Kalman Filter**:
   - State vector: $\mathbf{x} = [x, y, v_x, v_y, \psi, b_a, b_\omega]^T$.
   - Integrates vehicle motion dynamics in local East-North-Up (ENU) coordinates.
3. **Fixed 2D Non-Holonomic Constraints (NHC)**:
   - Enforces zero lateral velocity ($v_{\text{lat}} = 0$) perpendicular to the vehicle heading with lateral measurement noise $R_{\text{nhc}} = 0.04\text{ m}^2/\text{s}^2$.
4. **Causal IMU Jerk-Gated APM**:
   - Monitors longitudinal IMU jerk $j_{\text{long}} = \frac{a_{\text{long}}[k] - a_{\text{long}}[k-1]}{\Delta t}$.
   - When deceleration occurs ($a_{\text{long}} < -0.5\text{ m/s}^2$) and jerk satisfies $j_{\text{long}} < -1.0\text{ m/s}^3$, an acceleration-integrated velocity pseudo-measurement $z_{\text{apm}}$ bounds neural network over-estimation, eliminating long-duration speed drift.

---

## 🖥️ Interactive Web Showcase Suite (Cases 1–6)

To enable live interactive evaluation by SIH judges, a multi-scenario demonstration suite is included under [`prototype-new/`](file:///c:/Saravanakumar%20G/Projects/SIH26/IO-VNBD-master/prototype-new/):

- **Case 01 — Forest & Canopy Navigation**: Canopy-induced GNSS blockage and multipath degradation.
- **Case 02 — Mountain Tunnel Navigation**: Complete satellite denial inside long structural tunnels.
- **Case 03 — Deep Urban Canyon**: Multi-story building blockage and severe reflections.
- **Case 04 — Deep Valley / Mountain Road**: High-curvature winding mountain road navigation.
- **Case 05 — GNSS Jamming & Interference Event**: Explicit jamming attack detection and instantaneous fallback.
- **Case 06 — Planetary & Deep-Space Rover Navigation**: Conceptual GNSS-independent rover dead reckoning on planetary surfaces.

---

## 📁 Repository Structure

```
IO-VNBD-master/
├── navigation/                     # Modular Production Package (M028)
│   ├── __init__.py                 # Package exports
│   ├── speednet.py                 # PyTorch SpeedNet v2 model definition
│   ├── ekf.py                      # 7-State ENU EKF with Fixed 2D NHC
│   ├── apm.py                      # Causal Jerk-Gated APM module
│   └── run_m028.py                 # Canonical production evaluation script
├── prototype-new/                  # Interactive Showcase Suite (Cases 1-6)
│   ├── index.html                  # Master Launcher UI
│   ├── server.py                   # Single-command web server
│   ├── case1/ ... case6/           # Scenarios 1 to 6 web components
│   └── navigation/m028_adapter.py  # Python adapter connecting M028 to Web UI
├── milestones/                     # Complete Research History (M001–M052)
│   ├── README.md                   # Milestone Index & Phase Roadmap
│   ├── M001_vw04_dataset_formulation.md
│   ├── ...
│   └── M052.md                     # Centrifugal compensation study
├── scripts/                        # Experimental & Milestone Reproducibility Scripts
│   ├── vw4_m028_imu_jerk_apm.py    # Production research benchmark script
│   ├── vw4_speednet_v2_train.py    # SpeedNet training script
│   └── ...                         # Full research codebase
├── models/                         # Trained PyTorch Model Weights
│   ├── speednet_v2_w40.pth         # Canonical M028 Production Checkpoint
│   └── ...                         # Baseline & ablation weights
├── data/                           # Dataset Directory
│   └── ml_dataset/                 # Compact pre-processed ML dataset (.npz)
└── docs/                           # High-level architecture documentation
```

---

## ⚡ Quickstart & Reproduction Guide

### Prerequisites
- Python 3.10+
- PyTorch 2.0+
- NumPy, SciPy, Pandas, Matplotlib

### 1. Run Production Navigation Engine (M028 Baseline)
To evaluate the production navigation pipeline on the unseen test set and verify SIH benchmark compliance, run:

```bash
python navigation/run_m028.py
```

### 2. Launch Interactive Web Showcase Suite
To launch the interactive multi-case web demonstration for SIH judges:

```bash
python prototype-new/server.py
```
Then open your browser to `http://localhost:8080`.

---

## 🔬 Research Progression & Ablation Summary

Our research evolved through **52 systematic milestones**:
- **M001–M006**: Baseline dataset formulation and early regression models.
- **M007–M013**: SpeedNet multi-task architecture and physical boundary constraints.
- **M014–M027**: Zero-velocity updates (ZUPT) and APM speed damping.
- **M028**: **Canonical Production Baseline** (IMU Jerk-Gated APM).
- **M029–M039**: Jerk threshold sensitivity sweeps and turn attribution.
- **M040–M052**: Counterfactual audits (verifying zero lookahead leakage, NIS consistency, and confirming generalization failure of alternative centrifugal acceleration compensation models).

For details, view the [Milestones Catalog](milestones/README.md).

---

## 📜 Scientific Disclosure & License
This project was developed for the **Smart India Hackathon (SIH) 2026**. All research findings, models, and code are open for academic and evaluation purposes.
