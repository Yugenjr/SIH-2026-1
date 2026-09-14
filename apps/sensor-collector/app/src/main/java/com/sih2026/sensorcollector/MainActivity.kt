package com.sih2026.sensorcollector

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.SystemClock
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.sqrt

class MainActivity : AppCompatActivity(), SensorEventListener, LocationListener {

    private lateinit var sensorManager: SensorManager
    private lateinit var locationManager: LocationManager

    private var accelSensor: Sensor? = null
    private var gyroSensor: Sensor? = null

    // Background Threading for Sensor Callbacks & Disk I/O
    private var sensorThread: HandlerThread? = null
    private var sensorHandler: Handler? = null
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val uiHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var isRecording = false
    private var startTimeNanos: Long = 0L

    private var imuWriter: FileWriter? = null
    private var gnssWriter: FileWriter? = null

    // Event Counters
    private val accelCount = AtomicLong(0)
    private val gyroCount = AtomicLong(0)
    private val gnssCount = AtomicLong(0)

    // Volatile Telemetry for UI Display
    @Volatile private var lastAccelX = 0f
    @Volatile private var lastAccelY = 0f
    @Volatile private var lastAccelZ = 0f

    @Volatile private var lastGyroX = 0f
    @Volatile private var lastGyroY = 0f
    @Volatile private var lastGyroZ = 0f

    @Volatile private var lastSensorTimestampNanos: Long = 0L

    @Volatile private var gnssSpeedMps = 0f
    @Volatile private var gnssAccuracyM = 0f
    @Volatile private var gnssFixAvailable = false

    // UI Widgets
    private lateinit var tvStatus: TextView
    private lateinit var tvDuration: TextView
    private lateinit var tvAccelValues: TextView
    private lateinit var tvGyroValues: TextView
    private lateinit var tvMeasuredRates: TextView
    private lateinit var tvEventCounts: TextView
    private lateinit var tvLastTimestamp: TextView
    private lateinit var tvGnssStatus: TextView
    private lateinit var tvGnssSpeed: TextView
    private lateinit var btnToggle: Button

    // UI Refresh Runnable (Updates UI 6.6 times/sec without blocking sensors or I/O)
    private val uiUpdateRunnable = object : Runnable {
        override fun run() {
            if (isRecording) {
                val nowNanos = SystemClock.elapsedRealtimeNanos()
                val elapsedSec = (nowNanos - startTimeNanos) / 1e9

                val aX = lastAccelX
                val aY = lastAccelY
                val aZ = lastAccelZ
                val aMag = sqrt(aX * aX + aY * aY + aZ * aZ)

                val gX = lastGyroX
                val gY = lastGyroY
                val gZ = lastGyroZ
                val gMag = sqrt(gX * gX + gY * gY + gZ * gZ)

                val aCnt = accelCount.get()
                val gCnt = gyroCount.get()

                val accelHz = aCnt / maxOf(0.1, elapsedSec)
                val gyroHz = gCnt / maxOf(0.1, elapsedSec)

                tvDuration.text = String.format(Locale.US, "Duration: %.1f s", elapsedSec)
                tvAccelValues.text = String.format(Locale.US, "X: %+.2f | Y: %+.2f | Z: %+.2f\nMAG: %.2f m/s²", aX, aY, aZ, aMag)
                tvGyroValues.text = String.format(Locale.US, "X: %+.3f | Y: %+.3f | Z: %+.3f\nMAG: %.3f rad/s", gX, gY, gZ, gMag)
                tvMeasuredRates.text = String.format(Locale.US, "ACCEL Hz: %.1f Hz | GYRO Hz: %.1f Hz", accelHz, gyroHz)
                tvEventCounts.text = String.format(Locale.US, "ACCEL Events: %d | GYRO Events: %d", aCnt, gCnt)
                tvLastTimestamp.text = String.format(Locale.US, "LAST TIMESTAMP: %d ns", lastSensorTimestampNanos)

                if (gnssFixAvailable) {
                    tvGnssStatus.text = "GNSS Status: 3D FIX AVAILABLE ●"
                    tvGnssSpeed.text = String.format(Locale.US, "GNSS Speed: %.2f m/s | Acc: %.1f m", gnssSpeedMps, gnssAccuracyM)
                } else {
                    tvGnssStatus.text = "GNSS Status: SEARCHING..."
                    tvGnssSpeed.text = "GNSS Speed: -- m/s | Acc: -- m"
                }

                uiHandler.postDelayed(this, 150) // 150 ms refresh (~6.6 Hz)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvDuration = findViewById(R.id.tvDuration)
        tvAccelValues = findViewById(R.id.tvAccelValues)
        tvGyroValues = findViewById(R.id.tvGyroValues)
        tvMeasuredRates = findViewById(R.id.tvMeasuredRates)
        tvEventCounts = findViewById(R.id.tvEventCounts)
        tvLastTimestamp = findViewById(R.id.tvLastTimestamp)
        tvGnssStatus = findViewById(R.id.tvGnssStatus)
        tvGnssSpeed = findViewById(R.id.tvGnssSpeed)
        btnToggle = findViewById(R.id.btnToggle)

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        btnToggle.setOnClickListener {
            if (isRecording) stopRecording() else startRecording()
        }

        checkPermissions()
    }

    private fun checkPermissions() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 100)
        }
    }

    private fun startRecording() {
        val timestampStr = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val dir = File(getExternalFilesDir(null), "recordings_$timestampStr")
        dir.mkdirs()

        val imuFile = File(dir, "imu.csv")
        val gnssFile = File(dir, "gnss.csv")
        val metaFile = File(dir, "metadata.json")

        imuWriter = FileWriter(imuFile)
        imuWriter?.write("sensor_type,timestamp_ns,sensor_time_ns,val_x,val_y,val_z\n")

        gnssWriter = FileWriter(gnssFile)
        gnssWriter?.write("timestamp_ns,elapsed_realtime_ns,latitude,longitude,altitude,speed_mps,bearing_deg,accuracy_m,bearing_accuracy_deg\n")

        val metaJson = JSONObject()
        metaJson.put("device_model", android.os.Build.MODEL)
        metaJson.put("android_version", android.os.Build.VERSION.RELEASE)
        metaJson.put("requested_imu_rate_hz", 100)
        metaJson.put("orientation_convention", "X=Right, Y=Up/Forward, Z=Screen Normal")
        FileWriter(metaFile).use { it.write(metaJson.toString(2)) }

        // Start Sensor Handler Thread
        sensorThread = HandlerThread("SensorCallbackThread").apply { start() }
        sensorHandler = Handler(sensorThread!!.looper)

        startTimeNanos = SystemClock.elapsedRealtimeNanos()
        accelCount.set(0)
        gyroCount.set(0)
        gnssCount.set(0)
        isRecording = true

        // Register sensors on dedicated background thread with SENSOR_DELAY_FASTEST
        accelSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST, sensorHandler) }
        gyroSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST, sensorHandler) }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this, sensorThread!!.looper)
        }

        tvStatus.text = "Status: RECORDING ACTIVE ●"
        btnToggle.text = "Stop Recording"

        // Start smooth 6.6 Hz UI refresh loop
        uiHandler.post(uiUpdateRunnable)
    }

    private fun stopRecording() {
        isRecording = false
        uiHandler.removeCallbacks(uiUpdateRunnable)

        sensorManager.unregisterListener(this)
        locationManager.removeUpdates(this)

        sensorThread?.quitSafely()
        sensorThread = null
        sensorHandler = null

        ioExecutor.execute {
            imuWriter?.flush()
            imuWriter?.close()
            gnssWriter?.flush()
            gnssWriter?.close()
        }

        tvStatus.text = "Status: RECORDING STOPPED"
        btnToggle.text = "Start Recording"
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!isRecording) return

        val nowNanos = SystemClock.elapsedRealtimeNanos()
        val sensorTimeNanos = event.timestamp
        val isAccel = (event.sensor.type == Sensor.TYPE_ACCELEROMETER)
        val type = if (isAccel) "ACCEL" else "GYRO"

        val vX = event.values[0]
        val vY = event.values[1]
        val vZ = event.values[2]

        if (isAccel) {
            accelCount.incrementAndGet()
            lastAccelX = vX; lastAccelY = vY; lastAccelZ = vZ
        } else {
            gyroCount.incrementAndGet()
            lastGyroX = vX; lastGyroY = vY; lastGyroZ = vZ
        }
        lastSensorTimestampNanos = sensorTimeNanos

        // Offload File I/O to background Executor to prevent callback latency
        ioExecutor.execute {
            imuWriter?.write("$type,$nowNanos,$sensorTimeNanos,$vX,$vY,$vZ\n")
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onLocationChanged(location: Location) {
        if (!isRecording) return
        gnssCount.incrementAndGet()
        val nowNanos = SystemClock.elapsedRealtimeNanos()

        gnssSpeedMps = location.speed
        gnssAccuracyM = location.accuracy
        gnssFixAvailable = true

        val lat = location.latitude
        val lon = location.longitude
        val alt = location.altitude
        val spd = location.speed
        val brg = location.bearing
        val acc = location.accuracy
        val brgAcc = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) location.bearingAccuracyDegrees else 0f
        val locTimeNanos = location.elapsedRealtimeNanos

        ioExecutor.execute {
            gnssWriter?.write("$nowNanos,$locTimeNanos,$lat,$lon,$alt,$spd,$brg,$acc,$brgAcc\n")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRecording()
        ioExecutor.shutdown()
    }
}
