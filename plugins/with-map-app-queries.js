const { withAndroidManifest } = require('expo/config-plugins');

// Android 11+ hides other apps from Linking.canOpenURL unless the manifest lists them.
// Keep in sync with the apps in src/services/directions.ts.
const SCHEMES = ['google.navigation', 'waze', 'uber', 'bolt'];

const toQuery = (scheme) => ({
  action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
  data: [{ $: { 'android:scheme': scheme } }],
});

module.exports = function withMapAppQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const queries = manifest.queries ?? [{}];
    const first = queries[0];
    const existing = first.intent ?? [];
    const missing = SCHEMES.filter(
      (scheme) => !existing.some((i) => i.data?.some((d) => d.$?.['android:scheme'] === scheme))
    ).map(toQuery);
    manifest.queries = [{ ...first, intent: [...existing, ...missing] }, ...queries.slice(1)];
    return cfg;
  });
};
