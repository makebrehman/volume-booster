const { withAndroidManifest, withAndroidStyles } = require("@expo/config-plugins");

/**
 * Makes the MainActivity use a translucent/transparent window theme.
 * This allows the bottom sheet to float over the home screen or whatever
 * was visible before launching — no solid black background.
 *
 * Note: This makes the *activity window* transparent. To draw over OTHER
 * running apps (like GOOTEV's foreground service overlay), you additionally
 * need SYSTEM_ALERT_WINDOW and a native Android overlay service module.
 */

const withTransparentActivity = (config) => {
  config = withAndroidStyles(config, (mod) => {
    const styles = mod.modResults.resources.style ?? [];

    const alreadyExists = styles.some(
      (s) => s.$.name === "Theme.Loudify.Translucent"
    );

    if (!alreadyExists) {
      styles.push({
        $: {
          name: "Theme.Loudify.Translucent",
          parent: "Theme.AppCompat.NoActionBar",
        },
        item: [
          { $: { name: "android:windowIsTranslucent" }, _: "true" },
          { $: { name: "android:windowBackground" }, _: "@android:color/transparent" },
          { $: { name: "android:windowNoTitle" }, _: "true" },
          { $: { name: "android:windowActionBar" }, _: "false" },
          { $: { name: "android:colorBackgroundCacheHint" }, _: "@null" },
          { $: { name: "android:windowAnimationStyle" }, _: "@null" },
        ],
      });
    }

    mod.modResults.resources.style = styles;
    return mod;
  });

  config = withAndroidManifest(config, (mod) => {
    const mainActivity = mod.modResults.manifest.application?.[0]?.activity?.find(
      (a) => a.$["android:name"] === ".MainActivity"
    );

    if (mainActivity) {
      mainActivity.$["android:theme"] = "@style/Theme.Loudify.Translucent";
      mainActivity.$["android:windowSoftInputMode"] = "adjustResize";
    }

    return mod;
  });

  return config;
};

module.exports = withTransparentActivity;
