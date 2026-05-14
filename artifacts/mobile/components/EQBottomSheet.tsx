import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
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
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useColors } from "@/hooks/useColors";
import { useAudio } from "@/context/AudioContext";
import {
  requestNotificationPermission,
  showBoostNotification,
  dismissBoostNotification,
} from "@/utils/notifications";

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-3275201470124796/2503416589";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.48;
const HORIZONTAL_MARGIN = 14;
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - 44;

interface EQBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface AnimatedSliderProps {
  value: number;
  onChange: (val: number) => void;
  color: string;
  trackColor: string;
}

function AnimatedSlider({ value, onChange, color, trackColor }: AnimatedSliderProps) {
  const trackHeight = useRef(new Animated.Value(8)).current;
  const borderRadius = useRef(new Animated.Value(4)).current;
  const currentVal = useRef(value);
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);

  useEffect(() => {
    currentVal.current = value;
  }, [value]);

  const expand = () => {
    Animated.spring(trackHeight, {
      toValue: 22,
      useNativeDriver: false,
      tension: 200,
      friction: 10,
    }).start();
    Animated.spring(borderRadius, {
      toValue: 11,
      useNativeDriver: false,
      tension: 200,
      friction: 10,
    }).start();
  };

  const shrink = () => {
    Animated.spring(trackHeight, {
      toValue: 8,
      useNativeDriver: false,
      tension: 160,
      friction: 12,
    }).start();
    Animated.spring(borderRadius, {
      toValue: 4,
      useNativeDriver: false,
      tension: 160,
      friction: 12,
    }).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      expand();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const x = e.nativeEvent.locationX;
      const raw = x / SLIDER_TRACK_WIDTH;
      const clamped = Math.max(0, Math.min(1, raw));
      currentVal.current = clamped;
      onChange(clamped);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      const raw = x / SLIDER_TRACK_WIDTH;
      const clamped = Math.max(0, Math.min(1, raw));
      currentVal.current = clamped;
      onChange(clamped);
    },
    onPanResponderRelease: () => {
      shrink();
      Haptics.selectionAsync();
    },
  });

  const fillWidth = `${Math.round(value * 100)}%` as any;

  return (
    <Animated.View
      style={[
        styles.sliderTrack,
        {
          height: trackHeight,
          borderRadius,
          backgroundColor: trackColor,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.sliderFill,
          {
            width: fillWidth,
            borderRadius,
            backgroundColor: color,
          },
        ]}
      />
    </Animated.View>
  );
}

export function EQBottomSheet({ visible, onClose }: EQBottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { volume, setVolume, boost, setBoost, saveSettings } = useAudio();

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT + 80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [localVolume, setLocalVolume] = useState(volume / 100);
  const [localBoost, setLocalBoost] = useState(boost / 100);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (visible) {
      setLocalVolume(volume / 100);
      setLocalBoost(boost / 100);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 13,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SHEET_HEIGHT + 80,
          useNativeDriver: true,
          tension: 80,
          friction: 14,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleVolumeChange = (val: number) => {
    setLocalVolume(val);
    setVolume(Math.round(val * 100));
    saveSettings({ volume: Math.round(val * 100) });
  };

  const handleBoostChange = (val: number) => {
    const pct = Math.round(val * 100);
    setLocalBoost(val);
    setBoost(pct);
    saveSettings({ boost: pct });
    if (pct > 0) {
      showBoostNotification(pct);
    } else {
      dismissBoostNotification();
    }
  };

  const boostPct = Math.round(localBoost * 100);
  const boostColor =
    boostPct > 60 ? "#ff9500" : boostPct > 30 ? "#ffcc00" : colors.primary;
  const isBoostActive = boostPct > 0;

  const bottomPad = Platform.OS === "web" ? 30 : Math.max(insets.bottom, 16);
  const sheetBottom = Platform.OS === "web" ? 24 : 16;

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
            intensity={50}
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
              paddingBottom: bottomPad,
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>Volume Booster</Text>

          {isBoostActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.primary + "22" }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.activeText, { color: colors.primary }]}>
                Boost active · +{boostPct}%
              </Text>
            </View>
          )}

          <View style={styles.sliderBlock}>
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>
                VOLUME
              </Text>
              <Text style={[styles.sliderValue, { color: colors.foreground }]}>
                {Math.round(localVolume * 100)}%
              </Text>
            </View>
            <AnimatedSlider
              value={localVolume}
              onChange={handleVolumeChange}
              color={colors.primary}
              trackColor={colors.muted}
            />
          </View>

          <View style={styles.sliderBlock}>
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>
                BOOSTER
              </Text>
              <Text style={[styles.sliderValue, { color: boostColor }]}>
                +{boostPct}%
              </Text>
            </View>
            <AnimatedSlider
              value={localBoost}
              onChange={handleBoostChange}
              color={boostColor}
              trackColor={colors.muted}
            />
          </View>

          <View style={styles.adBox}>
            <BannerAd
              unitId={BANNER_AD_UNIT_ID}
              size={BannerAdSize.BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: false }}
            />
          </View>
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
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 20,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  activeText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
  },
  sliderBlock: {
    marginBottom: 26,
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1.4,
  },
  sliderValue: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
  sliderTrack: {
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
  },
  adBox: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    overflow: "hidden",
    borderRadius: 10,
  },
});
