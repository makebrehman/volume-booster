import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { applyBoost, releaseBoost } from "@/utils/loudnessEnhancer";

let VolumeManager: any = null;
if (Platform.OS !== "web") {
  try {
    VolumeManager = require("react-native-volume-manager").VolumeManager;
  } catch {}
}

export type OutputDevice = "speaker" | "bluetooth" | "headphones" | "earpiece";

export interface EQBands {
  bench: number;
  low: number;
  mid: number;
  high: number;
  effect: number;
}

export interface AudioState {
  isActive: boolean;
  volume: number;
  boost: number;
  eq: EQBands;
  outputDevice: OutputDevice;
  safeMode: boolean;
}

interface AudioContextType extends AudioState {
  setIsActive: (val: boolean) => void;
  setVolume: (val: number) => void;
  setBoost: (val: number) => void;
  setEQ: (bands: EQBands) => void;
  setOutputDevice: (device: OutputDevice) => void;
  setSafeMode: (val: boolean) => void;
  saveSettings: (overrides?: Partial<AudioState>) => Promise<void>;
  boostLabel: string;
  boostWarning: "safe" | "warning" | "risky";
}

const defaultState: AudioState = {
  isActive: false,
  volume: 65,
  boost: 0,
  eq: { bench: 0.5, low: 0.7, mid: 0.5, high: 0.45, effect: 0.4 },
  outputDevice: "speaker",
  safeMode: true,
};

const AudioContext = createContext<AudioContextType | null>(null);

const STORAGE_KEY = "@loudify_settings";

async function applyDeviceVolume(volumePct: number) {
  if (!VolumeManager || Platform.OS === "web") return;
  try {
    await VolumeManager.setVolume(volumePct / 100, { type: "music", showUI: false });
  } catch {}
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioState>(defaultState);
  const volumeListenerRef = useRef<any>(null);
  const ignoreHardwareRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AudioState>;
          const restored = { ...defaultState, ...saved, isActive: false };
          setState(restored);
          await applyBoost(restored.boost);
        }
      } catch {}

      if (VolumeManager && Platform.OS !== "web") {
        try {
          const result = await VolumeManager.getVolume("music");
          const currentVol =
            typeof result === "number" ? result : result?.volume ?? 0.65;
          setState((prev) => ({
            ...prev,
            volume: Math.round(currentVol * 100),
          }));
        } catch {}
      }
    })();

    if (VolumeManager && Platform.OS !== "web") {
      volumeListenerRef.current = VolumeManager.addVolumeListener(
        (result: { volume: number }) => {
          if (ignoreHardwareRef.current) return;
          const pct = Math.round(result.volume * 100);
          setState((prev) => ({ ...prev, volume: pct }));
          AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
              const base = raw ? JSON.parse(raw) : {};
              return AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...base, volume: pct })
              );
            })
            .catch(() => {});
        }
      );
    }

    return () => {
      volumeListenerRef.current?.remove?.();
      releaseBoost();
    };
  }, []);

  const saveSettings = useCallback(
    async (overrides?: Partial<AudioState>) => {
      const toSave = overrides ? { ...state, ...overrides } : state;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    },
    [state]
  );

  const setIsActive = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isActive: val }));
  }, []);

  const setVolume = useCallback((val: number) => {
    setState((prev) => ({ ...prev, volume: val }));
    ignoreHardwareRef.current = true;
    applyDeviceVolume(val).finally(() => {
      setTimeout(() => {
        ignoreHardwareRef.current = false;
      }, 300);
    });
  }, []);

  const setBoost = useCallback((val: number) => {
    setState((prev) => ({ ...prev, boost: val }));
    applyBoost(val);
    if (val > 0) {
      applyDeviceVolume(100);
    }
  }, []);

  const setEQ = useCallback((bands: EQBands) => {
    setState((prev) => ({ ...prev, eq: bands }));
  }, []);

  const setOutputDevice = useCallback((device: OutputDevice) => {
    setState((prev) => ({ ...prev, outputDevice: device }));
  }, []);

  const setSafeMode = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, safeMode: val }));
  }, []);

  const boostWarning: "safe" | "warning" | "risky" =
    state.boost <= 30 ? "safe" : state.boost <= 60 ? "warning" : "risky";

  const boostLabel =
    boostWarning === "safe"
      ? "Safe range"
      : boostWarning === "warning"
        ? "Moderate boost"
        : "High boost — may distort";

  return (
    <AudioContext.Provider
      value={{
        ...state,
        setIsActive,
        setVolume,
        setBoost,
        setEQ,
        setOutputDevice,
        setSafeMode,
        saveSettings,
        boostLabel,
        boostWarning,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used inside AudioProvider");
  return ctx;
}
