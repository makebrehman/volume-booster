import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { EQBottomSheet } from "@/components/EQBottomSheet";

export default function HomeScreen() {
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSheetVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setSheetVisible(true)}
      />
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
    backgroundColor: "transparent",
  },
});
