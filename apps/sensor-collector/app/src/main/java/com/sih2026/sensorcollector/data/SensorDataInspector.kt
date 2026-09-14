package com.sih2026.sensorcollector.data

import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import kotlin.math.sqrt

data class SensorStats(
    val minVal: Float = 0f,
    val maxVal: Float = 0f,
    val meanVal: Float = 0f,
    val stdDev: Float = 0f,
    val sampleCount: Long = 0,
    val measuredHz: Float = 0f,
    val timeSeries: List<Pair<Float, Float>> = emptyList() // (timeRelSec, magnitude)
)

data class GnssStats(
    val fixCount: Long = 0,
    val avgAccuracyM: Float = 0f,
    val minSpeedMps: Float = 0f,
    val maxSpeedMps: Float = 0f,
    val meanSpeedMps: Float = 0f,
    val durationSec: Float = 0f,
    val speedSeries: List<Pair<Float, Float>> = emptyList() // (timeRelSec, speedMps)
)

data class InspectionReport(
    val sessionFolder: File,
    val metadataJson: JSONObject?,
    val durationSec: Float,
    val accelStats: SensorStats,
    val gyroStats: SensorStats,
    val gnssStats: GnssStats
)

object SensorDataInspector {

    fun inspectSession(folder: File): InspectionReport {
        val imuFile = File(folder, "imu.csv")
        val gnssFile = File(folder, "gnss.csv")
        val metaFile = File(folder, "metadata.json")

        var metaJson: JSONObject? = null
        if (metaFile.exists()) {
            try {
                metaJson = JSONObject(metaFile.readText())
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        val accelSeries = mutableListOf<Pair<Float, Float>>()
        val gyroSeries = mutableListOf<Pair<Float, Float>>()
        var firstImuTimeNs: Long = -1L
        var lastImuTimeNs: Long = -1L

        var accelMin = Float.MAX_VALUE
        var accelMax = -Float.MAX_VALUE
        var accelSum = 0.0
        var accelSqSum = 0.0
        var accelCount = 0L

        var gyroMin = Float.MAX_VALUE
        var gyroMax = -Float.MAX_VALUE
        var gyroSum = 0.0
        var gyroSqSum = 0.0
        var gyroCount = 0L

        if (imuFile.exists()) {
            BufferedReader(FileReader(imuFile)).use { br ->
                val header = br.readLine() // skip header
                var line = br.readLine()
                var stepCounter = 0

                while (line != null) {
                    val parts = line.split(",")
                    if (parts.size >= 6) {
                        val type = parts[0].trim()
                        val sysTimeNs = parts[1].trim().toLongOrNull() ?: 0L
                        val x = parts[3].trim().toFloatOrNull() ?: 0f
                        val y = parts[4].trim().toFloatOrNull() ?: 0f
                        val z = parts[5].trim().toFloatOrNull() ?: 0f

                        if (firstImuTimeNs == -1L && sysTimeNs > 0) {
                            firstImuTimeNs = sysTimeNs
                        }
                        if (sysTimeNs > 0) lastImuTimeNs = sysTimeNs

                        val relSec = if (firstImuTimeNs > 0) (sysTimeNs - firstImuTimeNs) / 1e9f else 0f
                        val mag = sqrt(x * x + y * y + z * z)

                        if (type.contains("ACCEL", ignoreCase = true)) {
                            accelCount++
                            accelSum += mag
                            accelSqSum += (mag * mag)
                            if (mag < accelMin) accelMin = mag
                            if (mag > accelMax) accelMax = mag

                            // Downsample for chart (subsample max ~300 points)
                            if (stepCounter % 10 == 0) {
                                accelSeries.add(Pair(relSec, mag))
                            }
                        } else if (type.contains("GYRO", ignoreCase = true)) {
                            gyroCount++
                            gyroSum += mag
                            gyroSqSum += (mag * mag)
                            if (mag < gyroMin) gyroMin = mag
                            if (mag > gyroMax) gyroMax = mag

                            if (stepCounter % 10 == 0) {
                                gyroSeries.add(Pair(relSec, mag))
                            }
                        }
                        stepCounter++
                    }
                    line = br.readLine()
                }
            }
        }

        val totalDurationSec = if (firstImuTimeNs > 0 && lastImuTimeNs > firstImuTimeNs) {
            (lastImuTimeNs - firstImuTimeNs) / 1e9f
        } else 0f

        val safeDur = if (totalDurationSec > 0.1f) totalDurationSec else 1.0f

        val accelMean = if (accelCount > 0) (accelSum / accelCount).toFloat() else 0f
        val accelVar = if (accelCount > 0) Math.max(0.0, (accelSqSum / accelCount) - (accelMean * accelMean)).toFloat() else 0f
        val accelStd = sqrt(accelVar)

        val accelStats = SensorStats(
            minVal = if (accelCount > 0) accelMin else 0f,
            maxVal = if (accelCount > 0) accelMax else 0f,
            meanVal = accelMean,
            stdDev = accelStd,
            sampleCount = accelCount,
            measuredHz = accelCount / safeDur,
            timeSeries = accelSeries
        )

        val gyroMean = if (gyroCount > 0) (gyroSum / gyroCount).toFloat() else 0f
        val gyroVar = if (gyroCount > 0) Math.max(0.0, (gyroSqSum / gyroCount) - (gyroMean * gyroMean)).toFloat() else 0f
        val gyroStd = sqrt(gyroVar)

        val gyroStats = SensorStats(
            minVal = if (gyroCount > 0) gyroMin else 0f,
            maxVal = if (gyroCount > 0) gyroMax else 0f,
            meanVal = gyroMean,
            stdDev = gyroStd,
            sampleCount = gyroCount,
            measuredHz = gyroCount / safeDur,
            timeSeries = gyroSeries
        )

        // GNSS Inspection
        val gnssSeries = mutableListOf<Pair<Float, Float>>()
        var gnssFixCount = 0L
        var gnssAccuracySum = 0.0
        var gnssSpeedMin = Float.MAX_VALUE
        var gnssSpeedMax = -Float.MAX_VALUE
        var gnssSpeedSum = 0.0

        if (gnssFile.exists()) {
            BufferedReader(FileReader(gnssFile)).use { br ->
                val header = br.readLine()
                var line = br.readLine()
                while (line != null) {
                    val parts = line.split(",")
                    if (parts.size >= 8) {
                        val sysTimeNs = parts[0].trim().toLongOrNull() ?: 0L
                        val spd = parts[5].trim().toFloatOrNull() ?: 0f
                        val acc = parts[7].trim().toFloatOrNull() ?: 0f

                        val relSec = if (firstImuTimeNs > 0) (sysTimeNs - firstImuTimeNs) / 1e9f else 0f

                        gnssFixCount++
                        gnssAccuracySum += acc
                        gnssSpeedSum += spd
                        if (spd < gnssSpeedMin) gnssSpeedMin = spd
                        if (spd > gnssSpeedMax) gnssSpeedMax = spd

                        gnssSeries.add(Pair(relSec, spd))
                    }
                    line = br.readLine()
                }
            }
        }

        val gnssStats = GnssStats(
            fixCount = gnssFixCount,
            avgAccuracyM = if (gnssFixCount > 0) (gnssAccuracySum / gnssFixCount).toFloat() else 0f,
            minSpeedMps = if (gnssFixCount > 0) gnssSpeedMin else 0f,
            maxSpeedMps = if (gnssFixCount > 0) gnssSpeedMax else 0f,
            meanSpeedMps = if (gnssFixCount > 0) (gnssSpeedSum / gnssFixCount).toFloat() else 0f,
            durationSec = totalDurationSec,
            speedSeries = gnssSeries
        )

        return InspectionReport(
            sessionFolder = folder,
            metadataJson = metaJson,
            durationSec = totalDurationSec,
            accelStats = accelStats,
            gyroStats = gyroStats,
            gnssStats = gnssStats
        )
    }
}
