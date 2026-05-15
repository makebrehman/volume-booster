import { NativeModules, Platform } from "react-native";

const { LoudnessEnhancer: NativeLoudness } = NativeModules;

/**
 * Maps 0–100% boost to 0–1500 milliBels.
 *
 * Scale reference:
 *   0%   →    0 mB  (off)
 *   33%  →  500 mB  (+5 dB  — mild but audible boost)
 *   67%  → 1000 mB  (+10 dB — strong boost, most content sounds significantly louder)
 *   100% → 1500 mB  (+15 dB — maximum practical; risk of distortion on poor speakers)
 */
const PCT_TO_MB = 15;

export async function applyBoost(boostPct: number): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!NativeLoudness) {
    console.warn(
      "[LoudnessEnhancer] Native module not linked. " +
        "Ensure the withLoudnessEnhancer config plugin ran during EAS prebuild."
    );
    return;
  }
  try {
    const gainMb = Math.round(boostPct * PCT_TO_MB);
    await NativeLoudness.setGain(gainMb);
  } catch (e) {
    console.warn("[LoudnessEnhancer] setGain failed:", e);
  }
}

export async function releaseBoost(): Promise<void> {
  if (Platform.OS !== "android" || !NativeLoudness) return;
  try {
    await NativeLoudness.release();
  } catch {}
}
