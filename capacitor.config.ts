import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.dysadapt.dictadapt',
  appName: 'Dictadapt',
  webDir: 'dist',
  // No server block: the whole app is bundled, so the APK never needs a network.
  android: {
    // Children tap fast and repeatedly; the default fade makes it feel laggy.
    backgroundColor: '#ffffff',
  },
  plugins: {
    CapacitorHttp: { enabled: false },
  },
};

export default config;
