import 'dotenv/config';

export default {
  expo: {
    owner: 'doncodeo1', // 👈 Add this line
    name: 'GoCard App',
    slug: 'skuPulse',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/favicon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NFCReaderUsageDescription: 'We need NFC to scan RFID cards.',
        'com.apple.developer.nfc.readersession.iso7816.select-identifiers': [
          'A000000003000000',
          'D2760000850101',
        ],
      },
      buildNumber: '1',
    },
    entitlements: {
      'com.apple.developer.nfc.readersession.formats': ['NDEF', 'TAG'],
    },
    android: {
      permissions: [
        'NFC',
        'android.permission.NFC',
        'WRITE_EXTERNAL_STORAGE',
        'READ_EXTERNAL_STORAGE',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.anonymous.skupulseApp',
      versionCode: 1,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'react-native-nfc-manager',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: { origin: false },
      eas: { projectId: '216084fa-c98c-4684-95d2-5d78a97f6133' },

      TERMII_API_KEY:'TLMyDDUWQezlWXunIZupqEoaNQXKhvWBvqUEPMxoIandWuMTsArGNGpEqLGimm',
      TERMII_SENDER_ID: 'N-Alert',
      TERMII_API_URL: 'https://api.termii.com',
    },
  },
};
