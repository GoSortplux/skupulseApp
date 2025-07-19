// C:\Users\default.DESKTOP-10MKHTQ\Documents\dnet\SchoolRFIDApp\src\screens\HomeScreen.js
import React from 'react';
import { View, Button } from 'react-native';
import { startNfc } from '../nfc/nfcManager';

export default function HomeScreen({ navigation }) {
  const handleStartNfc = async () => {
    await startNfc();
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Start NFC Scanning" onPress={handleStartNfc} />
      <Button title="Register Student" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}