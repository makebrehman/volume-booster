import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, OutputDevice } from "@/context/AudioContext";
import { EQBottomSheet } from "@/components/EQBottomSheet";

const DEVICES: { id: OutputDevice; label: string; icon: string }[] = [
  { id: "speaker", label: "Speaker", icon: "volume-2" },
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { id: "headphones", label: "Headphones", icon: "headphones" },
  { id: "earpiece", label: "Earpiece", icon: "phone" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isActive,
    setIsActive,
    boost,
    volume,
    outputDevice,
    setOutputDevice,
    boostLabel,
    boostWarning,
    saveSettings,
  } = useAudio();

  const [eqVisible, setEqVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleToggle = async () => {
    const next = !isActive;
    Haptics.impactAsync(
      next ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
    );

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 6,
      }),
    ]).start();

    Animated.timing(glowAnim, {
      toValue: next ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();

    setIsActive(next);
    await saveSettings({ isActive: next });
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const warningColor =
    boostWarning === "safe"
      ? colors.primary
      : boostWarning === "warning"
        ? "#ffcc00"
        : "#ff9500";

  const currentDevice = DEVICES.find((d) => d.id === outputDevice) ?? DEVICES[0];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 8,
          paddingBottom: bottomPad + 8,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Text style={[styles.appName, { color: colors.foreground }]}>Loudify</Text>
        <Pressable
          onPress={() => setEqVisible(true)}
          style={[styles.eqPill, { backgroundColor: colors.card }]}
        >
          <Feather name="sliders" size={14} color={colors.mutedForeground} />
          <Text style={[styles.eqPillText, { color: colors.mutedForeground }]}>
            EQ
          </Text>
        </Pressable>
      </View>

      <View style={styles.deviceRow}>
        {DEVICES.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => {
              Haptics.selectionAsync();
              setOutputDevice(d.id);
            }}
            style={[
              styles.deviceChip,
              {
                backgroundColor:
                  outputDevice === d.id ? colors.primary : colors.card,
              },
            ]}
          >
            <Feather
              name={d.icon as any}
              size={14}
              color={outputDevice === d.id ? "#fff" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.deviceLabel,
                {
                  color:
                    outputDevice === d.id ? "#fff" : colors.mutedForeground,
                },
              ]}
            >
              {d.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.powerSection}>
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: colors.primary,
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={handleToggle}
            style={[
              styles.powerBtn,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name="power"
              size={52}
              color={isActive ? "#fff" : colors.mutedForeground}
            />
          </Pressable>
        </Animated.View>
      </View>

      <Text
        style={[
          styles.statusText,
          { color: isActive ? colors.primary : colors.mutedForeground },
        ]}
      >
        {isActive ? "BOOST ACTIVE" : "INACTIVE"}
      </Text>

      <View style={[styles.statsRow, { marginTop: 32 }]}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {volume}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Volume
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: warningColor }]}>
            +{boost}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Boost
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Feather
            name={currentDevice.icon as any}
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {currentDevice.label}
          </Text>
        </View>
      </View>

      <View style={[styles.warningBadge, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.warningDot,
            { backgroundColor: warningColor },
          ]}
        />
        <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
          {boostLabel}
        </Text>
      </View>

      <Pressable
        onPress={() => setEqVisible(true)}
        style={({ pressed }) => [
          styles.openEqBtn,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Feather name="sliders" size={18} color={colors.foreground} />
        <Text style={[styles.openEqText, { color: colors.foreground }]}>
          Open Volume & EQ
        </Text>
        <Feather name="chevron-up" size={18} color={colors.mutedForeground} />
      </Pressable>

      <EQBottomSheet visible={eqVisible} onClose={() => setEqVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  eqPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  eqPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  deviceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  deviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  deviceLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  powerSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  glow: {
    position: "absolute",
    alignSelf: "center",
  },
  powerBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#ff3b30",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  statusText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    marginTop: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  warningText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  openEqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  openEqText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
