import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, EQBands } from "@/context/AudioContext";
import { VerticalSlider } from "./VerticalSlider";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

interface EQBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const EQ_BANDS: { key: keyof EQBands; label: string }[] = [
  { key: "bench", label: "BENCH" },
  { key: "low", label: "LOW" },
  { key: "mid", label: "MID" },
  { key: "high", label: "HIGH" },
  { key: "effect", label: "EFFECT" },
];

export function EQBottomSheet({ visible, onClose }: EQBottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { eq, setEQ, volume, setVolume, boost, setBoost, saveSettings } =
    useAudio();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [localEQ, setLocalEQ] = useState<EQBands>(eq);
  const [localVolume, setLocalVolume] = useState(volume / 100);
  const [localBoost, setLocalBoost] = useState(boost / 100);
  const [highlightedBand, setHighlightedBand] = useState<keyof EQBands>("low");

  useEffect(() => {
    if (visible) {
      setLocalEQ(eq);
      setLocalVolume(volume / 100);
      setLocalBoost(boost / 100);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleBandChange = (key: keyof EQBands, val: number) => {
    setHighlightedBand(key);
    setLocalEQ((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEQ(localEQ);
    setVolume(Math.round(localVolume * 100));
    setBoost(Math.round(localBoost * 100));
    await saveSettings({
      eq: localEQ,
      volume: Math.round(localVolume * 100),
      boost: Math.round(localBoost * 100),
    });
    onClose();
  };

  const getLowPassLabel = () => {
    const db = ((localEQ[highlightedBand] - 0.5) * 2).toFixed(2);
    const sign = parseFloat(db) >= 0 ? "+" : "";
    return `Low pass: ${sign}${db} dB; Volume: ${Math.round(localVolume * 100)}%`;
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT + bottomPad + 20,
            backgroundColor: colors.card,
            transform: [{ translateY: slideAnim }],
            paddingBottom: bottomPad + 20,
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Volume & EQ
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {getLowPassLabel()}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.slidersRow}>
          {EQ_BANDS.map(({ key, label }) => (
            <VerticalSlider
              key={key}
              value={localEQ[key]}
              onChange={(val) => handleBandChange(key, val)}
              label={label}
              highlighted={highlightedBand === key}
              height={160}
              width={48}
            />
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.bottomControls}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>
              Volume
            </Text>
            <Text style={[styles.controlValue, { color: colors.foreground }]}>
              {Math.round(localVolume * 100)}%
            </Text>
          </View>
          <View style={[styles.hSliderTrack, { backgroundColor: colors.muted }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
                const { locationX, nativeEvent } = e;
                const trackWidth =
                  typeof nativeEvent.target === "number" ? 280 : 280;
                const val = Math.max(0, Math.min(1, locationX / trackWidth));
                setLocalVolume(val);
              }}
            >
              <View
                style={[
                  styles.hSliderFill,
                  {
                    width: `${localVolume * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>
              Boost
            </Text>
            <Text style={[styles.controlValue, { color: colors.foreground }]}>
              {Math.round(localBoost * 100)}%
            </Text>
          </View>
          <View style={[styles.hSliderTrack, { backgroundColor: colors.muted }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
                const { locationX } = e;
                const val = Math.max(0, Math.min(1, locationX / 280));
                setLocalBoost(val);
              }}
            >
              <View
                style={[
                  styles.hSliderFill,
                  {
                    width: `${localBoost * 100}%`,
                    backgroundColor:
                      localBoost > 0.6
                        ? "#ff9500"
                        : localBoost > 0.3
                          ? "#ffcc00"
                          : colors.primary,
                  },
                ]}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: colors.background }]}>
            Save changes
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  slidersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  bottomControls: {
    gap: 8,
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  controlValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  hSliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  hSliderFill: {
    height: "100%",
    borderRadius: 3,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
