const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin that injects a native Android LoudnessEnhancer module.
 *
 * Android's LoudnessEnhancer AudioEffect can amplify audio beyond the system
 * volume max. Session ID 0 targets the global/master audio mix on most devices,
 * meaning it affects all playing audio (music, video, etc.).
 *
 * Gain is specified in milliBels (mB). Useful range:
 *   0 mB    = no boost (off)
 *   1000 mB = +10 dB  (~3x perceived loudness, noticeable on most content)
 *   2000 mB = +20 dB  (max practical; distortion risk on low-quality speakers)
 *
 * The JS module maps the user's 0–100% slider to 0–1500 mB.
 */

const LOUDNESS_MODULE_KT = `package com.makebrehman.loudify

import android.media.audiofx.LoudnessEnhancer
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LoudnessEnhancerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "LoudnessEnhancerModule"
        private const val GLOBAL_SESSION = 0
    }

    private var enhancer: LoudnessEnhancer? = null

    override fun getName() = "LoudnessEnhancer"

    @ReactMethod
    fun setGain(gainMb: Int, promise: Promise) {
        try {
            if (enhancer == null) {
                enhancer = LoudnessEnhancer(GLOBAL_SESSION)
            }
            enhancer?.apply {
                setTargetGain(gainMb)
                enabled = gainMb > 0
            }
            Log.d(TAG, "Gain set to \${gainMb} mB (enabled=\${gainMb > 0})")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setGain failed: \${e.message}")
            promise.reject("LOUDNESS_ERROR", "setGain failed: \${e.message}", e)
        }
    }

    @ReactMethod
    fun getGain(promise: Promise) {
        try {
            val gain = enhancer?.targetGain?.toInt() ?: 0
            promise.resolve(gain)
        } catch (e: Exception) {
            promise.reject("LOUDNESS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            enhancer?.release()
            enhancer = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LOUDNESS_ERROR", e.message, e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            enhancer?.release()
            enhancer = null
        } catch (_: Exception) {}
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

const withLoudnessEnhancer = (config) => {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const packageDir = path.join(
        projectRoot,
        "android/app/src/main/java/com/makebrehman/loudify"
      );

      fs.mkdirSync(packageDir, { recursive: true });

      fs.writeFileSync(
        path.join(packageDir, "LoudnessEnhancerModule.kt"),
        LOUDNESS_MODULE_KT,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(packageDir, "LoudnessEnhancerPackage.kt"),
        LOUDNESS_PACKAGE_KT,
        "utf-8"
      );

      const mainAppPath = path.join(packageDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf-8");
        if (!content.includes("LoudnessEnhancerPackage")) {
          content = content.replace(
            /PackageList\(this\)\.packages\.apply\s*\{/,
            "PackageList(this).packages.apply {\n        add(LoudnessEnhancerPackage())"
          );
          fs.writeFileSync(mainAppPath, content, "utf-8");
        }
      }

      return mod;
    },
  ]);
};

module.exports = withLoudnessEnhancer;
