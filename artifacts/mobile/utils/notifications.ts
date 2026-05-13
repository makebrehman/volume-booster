import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const BOOST_NOTIFICATION_ID = "loudify-boost-active";

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function showBoostNotification(boostPct: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      identifier: BOOST_NOTIFICATION_ID,
      content: {
        title: "Loudify — Boost Active",
        body: `+${boostPct}% volume boost is running`,
        data: { boostPct },
        sticky: true,
      },
      trigger: null,
    });
  } catch {}
}

export async function dismissBoostNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}
