import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, EQBands } from "@/context/AudioContext";
import { VerticalSlider } from "./VerticalSlider";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.62;
const HORIZONTAL_MARGIN = 14;

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
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT + 60)).current;
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
          tension: 70,
          friction: 14,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT + 60,
          duration: 300,
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
  const sheetBottom = Platform.OS === "web" ? 28 : 20 + (insets.bottom > 0 ? 0 : 8);

  const boostColor =
    localBoost > 0.6 ? "#ff9500" : localBoost > 0.3 ? "#ffcc00" : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <BlurView
            intensity={55}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetWrapper,
          {
            bottom: sheetBottom,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: bottomPad + 12,
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
              style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
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
                height={155}
                width={46}
              />
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>
                VOLUME
              </Text>
              <Text style={[styles.sliderValue, { color: colors.foreground }]}>
                {Math.round(localVolume * 100)}%
              </Text>
            </View>
            <View style={[styles.hTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.hFill,
                  {
                    width: `${localVolume * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(e) => {
                  const val = Math.max(0, Math.min(1, e.nativeEvent.locationX / 280));
                  setLocalVolume(val);
                }}
              />
            </View>

            <View style={[styles.sliderHeader, { marginTop: 14 }]}>
              <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>
                BOOST
              </Text>
              <Text style={[styles.sliderValue, { color: boostColor }]}>
                {Math.round(localBoost * 100)}%
              </Text>
            </View>
            <View style={[styles.hTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.hFill,
                  {
                    width: `${localBoost * 100}%`,
                    backgroundColor: boostColor,
                  },
                ]}
              />
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(e) => {
                  const val = Math.max(0, Math.min(1, e.nativeEvent.locationX / 280));
                  setLocalBoost(val);
                }}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: colors.foreground,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.saveBtnText, { color: colors.background }]}>
              Save changes
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  sheetWrapper: {
    position: "absolute",
    left: HORIZONTAL_MARGIN,
    right: HORIZONTAL_MARGIN,
  },
  sheet: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  handle: {
    width: 36,
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
    marginBottom: 24,
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
    marginBottom: 22,
  },
  divider: {
    height: 1,
    marginBottom: 18,
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  sliderValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  hTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  hFill: {
    height: "100%",
    borderRadius: 4,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
