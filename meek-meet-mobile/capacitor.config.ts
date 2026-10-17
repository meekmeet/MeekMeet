import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meekmeet.app',
  appName: 'Meek Meet',
  webDir: 'dist',
  versionName: '1.0.22',
  versionCode: 127,
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#faf6ee',
    scheme: 'Meek Meet',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#faf6ee',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#faf6ee',
    },
  },
  android: {
    minSdkVersion: 24,
    targetSdkVersion: 36,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
