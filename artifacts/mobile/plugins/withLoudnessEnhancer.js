const { withDangerousMod, withAndroidManifest } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin — native Android LoudnessEnhancer + foreground service.
 *
 * What this does:
 *  1. Writes LoudnessEnhancerModule.kt  — RN bridge (delegates to service)
 *  2. Writes LoudnessEnhancerPackage.kt — registers the module
 *  3. Writes LoudnessBoostService.kt    — foreground service that owns the
 *     LoudnessEnhancer AudioEffect so it survives app backgrounding /
 *     screen lock / task switching.
 *  4. Patches MainApplication.kt       — adds package to the list
 *  5. Patches AndroidManifest.xml      — registers the service with
 *     foregroundServiceType="mediaPlayback"
 *
 * Gain is in milliBels (mB):
 *   0 mB    = off
 *   500 mB  = +5 dB
 *   1000 mB = +10 dB
 *   1500 mB = +15 dB  (mapped from 100% slider)
 */

// ─── Kotlin source files ──────────────────────────────────────────────────────

const LOUDNESS_MODULE_KT = `package com.makebrehman.loudify

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native bridge module.
 * All actual audio work lives in LoudnessBoostService so the effect
 * survives the app being backgrounded or the screen locking.
 */
class LoudnessEnhancerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "LoudnessEnhancerModule"
    }

    override fun getName() = "LoudnessEnhancer"

    private fun dispatchToService(gainMb: Int) {
        val ctx = reactApplicationContext
        val intent = Intent(ctx, LoudnessBoostService::class.java).apply {
            action = LoudnessBoostService.ACTION_SET_GAIN
            putExtra(LoudnessBoostService.EXTRA_GAIN_MB, gainMb)
        }
        if (gainMb > 0) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
        } else {
            val stopIntent = Intent(ctx, LoudnessBoostService::class.java).apply {
                action = LoudnessBoostService.ACTION_STOP
            }
            ctx.startService(stopIntent)
        }
    }

    @ReactMethod
    fun setGain(gainMb: Int, promise: Promise) {
        try {
            dispatchToService(gainMb)
            Log.d(TAG, "Dispatched gain \${gainMb} mB to service")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setGain failed: \${e.message}")
            promise.reject("LOUDNESS_ERROR", "setGain failed: \${e.message}", e)
        }
    }

    @ReactMethod
    fun getGain(promise: Promise) {
        promise.resolve(0)
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            dispatchToService(0)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LOUDNESS_ERROR", e.message, e)
        }
    }
}
`;

const LOUDNESS_PACKAGE_KT = `package com.makebrehman.loudify

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LoudnessEnhancerPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(LoudnessEnhancerModule(context))

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

const LOUDNESS_SERVICE_KT = `package com.makebrehman.loudify

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.audiofx.LoudnessEnhancer
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service that owns the LoudnessEnhancer AudioEffect.
 *
 * Running as a foreground service means:
 * - Android won't kill it when the app is backgrounded or the screen locks.
 * - A persistent notification is shown while the boost is active (required by Android).
 * - The LoudnessEnhancer keeps running on global audio session 0, affecting
 *   all currently playing audio streams on the device.
 */
class LoudnessBoostService : Service() {

    companion object {
        private const val TAG = "LoudnessBoostService"
        private const val CHANNEL_ID = "loudify_boost"
        private const val NOTIF_ID = 2001
        private const val GLOBAL_SESSION = 0

        const val ACTION_SET_GAIN = "com.makebrehman.loudify.SET_GAIN"
        const val ACTION_STOP     = "com.makebrehman.loudify.STOP"
        const val EXTRA_GAIN_MB   = "gainMb"
    }

    private var enhancer: LoudnessEnhancer? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SET_GAIN -> {
                val gainMb = intent.getIntExtra(EXTRA_GAIN_MB, 0)
                applyGain(gainMb)
                if (gainMb > 0) {
                    startForeground(NOTIF_ID, buildNotification(gainMb))
                } else {
                    stopSelf()
                }
            }
            ACTION_STOP -> {
                releaseEnhancer()
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun applyGain(gainMb: Int) {
        try {
            if (enhancer == null) {
                enhancer = LoudnessEnhancer(GLOBAL_SESSION)
            }
            enhancer?.apply {
                setTargetGain(gainMb)
                enabled = gainMb > 0
            }
            Log.d(TAG, "Gain applied: \${gainMb} mB, enabled=\${gainMb > 0}")
        } catch (e: Exception) {
            Log.e(TAG, "applyGain error: \${e.message}")
        }
    }

    private fun releaseEnhancer() {
        try { enhancer?.release() } catch (_: Exception) {}
        enhancer = null
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseEnhancer()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Loudify Boost",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active while volume boost is running"
                setSound(null, null)
                enableVibration(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(gainMb: Int): Notification {
        val boostPct = (gainMb / 15).coerceIn(0, 100)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Loudify — Boost Active")
            .setContentText("+\${boostPct}% boost is running in the background")
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
`;

// ─── Plugin ───────────────────────────────────────────────────────────────────

const withLoudnessEnhancer = (config) => {
  // Step 1 — write Kotlin source files + patch MainApplication.kt
  config = withDangerousMod(config, [
    "android",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const pkgDir = path.join(
        projectRoot,
        "android/app/src/main/java/com/makebrehman/loudify"
      );

      fs.mkdirSync(pkgDir, { recursive: true });

      fs.writeFileSync(path.join(pkgDir, "LoudnessEnhancerModule.kt"), LOUDNESS_MODULE_KT, "utf-8");
      fs.writeFileSync(path.join(pkgDir, "LoudnessEnhancerPackage.kt"), LOUDNESS_PACKAGE_KT, "utf-8");
      fs.writeFileSync(path.join(pkgDir, "LoudnessBoostService.kt"), LOUDNESS_SERVICE_KT, "utf-8");

      const mainAppPath = path.join(pkgDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let src = fs.readFileSync(mainAppPath, "utf-8");
        if (!src.includes("LoudnessEnhancerPackage")) {
          src = src.replace(
            /PackageList\(this\)\.packages\.apply\s*\{/,
            "PackageList(this).packages.apply {\n        add(LoudnessEnhancerPackage())"
          );
          fs.writeFileSync(mainAppPath, src, "utf-8");
        }
      }

      return mod;
    },
  ]);

  // Step 2 — register the service in AndroidManifest.xml
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;

    const services = app.service ?? [];
    const alreadyRegistered = services.some(
      (s) => s.$?.["android:name"] === ".LoudnessBoostService"
    );

    if (!alreadyRegistered) {
      services.push({
        $: {
          "android:name": ".LoudnessBoostService",
          "android:foregroundServiceType": "mediaPlayback",
          "android:exported": "false",
        },
      });
      app.service = services;
    }

    return mod;
  });

  return config;
};

module.exports = withLoudnessEnhancer;
