import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { EQBottomSheet } from "@/components/EQBottomSheet";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSheetVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setSheetVisible(true)}
      />
      {!sheetVisible && (
        <Pressable onPress={() => setSheetVisible(true)} style={styles.hint}>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Tap to open controls
          </Text>
        </Pressable>
      )}
      <EQBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  hint: {
    alignSelf: "center",
    marginBottom: 200,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
