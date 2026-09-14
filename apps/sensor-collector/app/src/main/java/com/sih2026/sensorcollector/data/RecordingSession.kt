package com.sih2026.sensorcollector.data

import java.io.File

data class RecordingSession(
    val folderName: String,
    val folderPath: String,
    val dateFormatted: String,
    val durationSec: Double,
    val accelCount: Long,
    val gyroCount: Long,
    val gnssCount: Long,
    val totalSizeBytes: Long,
    val isComplete: Boolean,
    val imuFileExists: Boolean,
    val gnssFileExists: Boolean,
    val metaFileExists: Boolean
) {
    val totalImuEvents: Long
        get() = accelCount + gyroCount

    val formattedSize: String
        get() {
            val kb = totalSizeBytes / 1024.0
            val mb = kb / 1024.0
            return if (mb >= 1.0) String.format("%.2f MB", mb) else String.format("%.1f KB", kb)
        }
}
