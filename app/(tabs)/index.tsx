import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="wifi" size={24} color={Colors[colorScheme ?? 'light'].text} />
        <ThemedText type="defaultSemiBold">Connected</ThemedText>
      </View>
      <View style={styles.mainContent}>
        <ThemedText type="title" style={styles.title}>
          Ready to Scan?
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Tap the button to start scanning student RFID cards.
        </ThemedText>
        <Link href="/scan" asChild>
          <TouchableOpacity style={[styles.scanButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <IconSymbol name="qrcode.viewfinder" size={width * 0.2} color="white" />
            <Text style={styles.scanButtonText}>Tap to Scan</Text>
          </TouchableOpacity>
        </Link>
      </View>
      <View style={styles.footer}>
        <IconSymbol name="gear" size={24} color={Colors[colorScheme ?? 'light'].text} />
        <IconSymbol name="info.circle" size={24} color={Colors[colorScheme ?? 'light'].text} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 40,
    textAlign: 'center',
    color: Colors.light.gray,
  },
  scanButton: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
});
