import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface VerticalSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  highlighted?: boolean;
  height?: number;
  width?: number;
}

export function VerticalSlider({
  value,
  onChange,
  label,
  highlighted = false,
  height = 160,
  width = 44,
}: VerticalSliderProps) {
  const colors = useColors();
  const thumbRef = useRef(new Animated.Value(0)).current;
  const currentValue = useRef(value);
  const trackHeight = height - 32;

  const getThumbOffset = (val: number) => (1 - val) * trackHeight;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      thumbRef.setOffset(getThumbOffset(currentValue.current));
      thumbRef.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      const raw = gestureState.dy;
      const offset = getThumbOffset(currentValue.current) + raw;
      const clamped = Math.max(0, Math.min(trackHeight, offset));
      const newVal = 1 - clamped / trackHeight;
      currentValue.current = newVal;
      onChange(newVal);
    },
    onPanResponderRelease: () => {
      thumbRef.flattenOffset();
    },
  });

  const thumbTop = getThumbOffset(value);

  const trackColor = highlighted ? colors.primary : colors.secondary;
  const fillHeight = value * trackHeight;

  return (
    <View style={[styles.container, { width }]}>
      <View
        style={[styles.track, { height, width: width * 0.55, borderRadius: width * 0.275 }, { backgroundColor: colors.muted }]}
        {...pan.panHandlers}
      >
        <View
          style={[
            styles.fill,
            {
              height: fillHeight,
              bottom: 0,
              borderRadius: width * 0.275,
              backgroundColor: trackColor,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              top: thumbTop,
              width: width * 0.55 - 8,
              height: width * 0.55 - 8,
              borderRadius: (width * 0.55 - 8) / 2,
              backgroundColor: highlighted ? colors.primary : colors.card,
              borderColor: highlighted ? colors.primary : colors.border,
            },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: highlighted ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },
  track: {
    position: "relative",
    overflow: "visible",
    alignItems: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  thumb: {
    position: "absolute",
    borderWidth: 2,
    shadowColor: "#ff3b30",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
