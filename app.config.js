import 'dotenv/config';

export default {
  expo: {
    name: 'Glisten SAS',
    slug: 'school-rfid-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      // image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NFCReaderUsageDescription: 'We need NFC to scan RFID cards.',
        'com.apple.developer.nfc.readersession.iso7816.select-identifiers': ['A000000003000000', 'D2760000850101'],
      },
      buildNumber: '1',
    },
    entitlements: {
      'com.apple.developer.nfc.readersession.formats': ['NDEF', 'TAG'],
    },
    android: {
      permissions: ['NFC', 'android.permission.NFC', 'WRITE_EXTERNAL_STORAGE', 'READ_EXTERNAL_STORAGE'],
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.anonymous.SchoolRFIDApp',
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
      eas: { projectId: '8b04df91-96fd-4d42-aeba-974b8ed51211' },
      // SMSLIVE247_API_KEY: 'MA-0c9113bb-fdf0-4bc1-a2c2-b4db3f5de5b2',
      // SMSLIVE247_SENDER: 'Glisten',

       // +++ ADDED NEW TERMII KEYS +++
      TERMII_API_KEY: 'TLMyDDUWQezlWXunIZupqEoaNQXKhvWBvqUEPMxoIandWuMTsArGNGpEqLGimm',      
      TERMII_SENDER_ID: 'N-Alert',        
      TERMII_API_URL: 'https://v3.api.termii.com/api/sms/send', 
    },
  },
};

