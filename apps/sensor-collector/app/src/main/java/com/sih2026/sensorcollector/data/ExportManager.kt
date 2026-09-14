package com.sih2026.sensorcollector.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object ExportManager {

    fun zipSession(context: Context, sessionFolder: File): File? {
        return try {
            val cacheDir = File(context.cacheDir, "exports")
            cacheDir.mkdirs()
            
            val zipFile = File(cacheDir, "${sessionFolder.name}.zip")
            if (zipFile.exists()) zipFile.delete()

            ZipOutputStream(FileOutputStream(zipFile)).use { zos ->
                sessionFolder.listFiles()?.forEach { file ->
                    if (file.isFile) {
                        FileInputStream(file).use { fis ->
                            val zipEntry = ZipEntry("${sessionFolder.name}/${file.name}")
                            zos.putNextEntry(zipEntry)
                            fis.copyTo(zos)
                            zos.closeEntry()
                        }
                    }
                }
            }
            zipFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun shareSession(context: Context, sessionFolder: File) {
        val zipFile = zipSession(context, sessionFolder) ?: return
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            zipFile
        )

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/zip"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        val chooser = Intent.createChooser(intent, "Export SensorLab Session")
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
    }
}
