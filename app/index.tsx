// app/index.tsx
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, Pressable, Button } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getStudents, Student, resetStudentStatuses } from '../src/utils/storage';
import { AuthContext } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Install @expo/vector-icons

export default function HomeScreen() {
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [manualClockEnabled, setManualClockEnabled] = useState(true);
  const { isAdmin, login } = useContext(AuthContext);

  useEffect(() => {
    resetStudentStatuses().catch((error) => console.error('Error resetting student statuses:', error));
    AsyncStorage.getItem('@SchoolRFIDApp:manualClockEnabled').then((value) => setManualClockEnabled(value !== 'false'));
  }, []);

  const fetchRecentStudents = async () => {
    try {
      const studentList = await getStudents();
      const sortedStudents = studentList
        .filter((student) => student.lastEvent !== null)
        .sort((a, b) => (b.lastEvent?.timestamp || 0) - (a.lastEvent?.timestamp || 0))
        .slice(0, 5);
      setRecentStudents(sortedStudents);
    } catch (error) {
      console.error('Error fetching recent students:', error);
    }
  };

  useFocusEffect(useCallback(() => { fetchRecentStudents(); }, []));

  const handleNavigate = (path: string) => {
    const protectedRoutes = ['/rfid', '/register', '/students', '/attendance', '/settings'];
    if (protectedRoutes.includes(path) && !isAdmin) {
      setTargetRoute(path);
      setModalVisible(true);
    } else if (path === '/manual' && !manualClockEnabled) {
      Alert.alert('Error', 'Manual Clock-In/Out is disabled in settings.');
    } else {
      router.push(path as any);
    }
  };

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) {
      setModalVisible(false);
      setUsername('');
      setPassword('');
      if (targetRoute) {
        router.push(targetRoute as any);
        setTargetRoute(null);
      }
    } else {
      Alert.alert('Error', 'Invalid username or password');
    }
  };

  const openSettings = () => {
    if (isAdmin) {
      router.push('/settings' as any);
    } else {
      setTargetRoute('/settings');
      setModalVisible(true);
    }
  };

  const renderItem = ({ item }: { item: Student }) => (
    <View style={styles.studentItem}>
      <Text style={styles.studentText}>Name: {item.name}</Text>
      <Text style={styles.studentText}>RFID: {item.rfid}</Text>
      <Text style={styles.studentText}>Admission: {item.admissionNumber}</Text>
      {item.lastEvent && (
        <Text style={styles.studentText}>
          Last: {item.lastEvent.event} at {new Date(item.lastEvent.timestamp).toLocaleString()}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Pressable onPress={openSettings} style={styles.settingsIcon}>
          <Ionicons name="settings-sharp" size={30} color="#4A90E2" />
        </Pressable>
      </View>
      <Text style={styles.title}>G Smart Attendance System</Text>
      <View style={styles.buttonGrid}>
        <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/scan')}>
          <Text style={styles.buttonText}>Scan RFID</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/register')}>
          <Text style={styles.buttonText}>Register Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/students')}>
          <Text style={styles.buttonText}>View Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/attendance')}>
          <Text style={styles.buttonText}>Attendance Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/messages')}>
          <Text style={styles.buttonText}>Sent Messages</Text>
        </TouchableOpacity>
        {manualClockEnabled && (
          <TouchableOpacity style={styles.button} onPress={() => handleNavigate('/manual')}>
            <Text style={styles.buttonText}>Manual Clock-In/Out</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.subtitle}>Recent Students</Text>
      {recentStudents.length === 0 ? (
        <Text style={styles.noDataText}>No recent activity</Text>
      ) : (
        <FlatList
          data={recentStudents}
          renderItem={renderItem}
          keyExtractor={(item) => item.rfid}
          style={styles.list}
        />
      )}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button title="Login" onPress={handleLogin} color="#4A90E2" />
            <Button title="Cancel" onPress={() => setModalVisible(false)} color="#E74C3C" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: { width: 80, height: 80, resizeMode: 'contain' },
  settingsIcon: { padding: 10 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'Poppins-Bold',
  },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 15,
    fontFamily: 'Poppins-Medium',
  },
  list: { flex: 1 },
  studentItem: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  studentText: { fontSize: 14, color: '#2C3E50', marginBottom: 5, fontFamily: 'Poppins-Regular' },
  noDataText: { fontSize: 16, color: '#7F8C8D', textAlign: 'center', marginTop: 20, fontFamily: 'Poppins-Regular' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 25,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: '#2C3E50', fontFamily: 'Poppins-Bold' },
  input: {
    height: 50,
    borderColor: '#D3DCE6',
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
});