// app/index.tsx
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, Pressable, Button } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getStudents, Student, resetStudentStatuses } from '../src/utils/storage';
import { AuthContext } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../src/hooks/useApi';

export default function HomeScreen() {
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [manualClockEnabled, setManualClockEnabled] = useState(true);
  const { isAdmin, login } = useContext(AuthContext);
  const callApi = useApi();

  const fetchRecentStudents = useCallback(async () => {
    if (!isAdmin) {
      setRecentStudents([]);
      return;
    }
    const schoolId = await AsyncStorage.getItem('@skupulseApp:schoolId');
    if (!schoolId) {
      return;
    }

    const studentList = await callApi(getStudents);

    if (studentList) {
      const sortedStudents = studentList
        .filter((student: Student) => student.lastEvent !== null)
        .sort((a: Student, b: Student) => (b.lastEvent?.timestamp || 0) - (a.lastEvent?.timestamp || 0))
        .slice(0, 5);
      setRecentStudents(sortedStudents);
    }
  }, [isAdmin, callApi]);

  useEffect(() => {
    resetStudentStatuses().catch((error) => console.error('Error resetting student statuses:', error));
    AsyncStorage.getItem('@skupulseApp:manualClockEnabled').then((value) => setManualClockEnabled(value !== 'false'));
    fetchRecentStudents();
  }, [fetchRecentStudents]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentStudents();
    }, [fetchRecentStudents])
  );

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
        <Image source={require('../assets/images/logo.png')} style={styles.logo} />
        <Pressable onPress={openSettings} style={styles.settingsIcon}>
          <Ionicons name="settings-sharp" size={30} color="#4A90E2" />
        </Pressable>
      </View>
      <Text style={styles.title}>GoCard</Text>
      <View style={styles.mainAction}>
        <TouchableOpacity style={styles.goScanButton} onPress={() => handleNavigate('/scan')}>
          <Ionicons name="scan" size={50} color="#FFF" />
          <Text style={styles.goScanButtonText}>Go Scan</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonGrid}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleNavigate('/register')}>
          <Ionicons name="person-add" size={30} color="#4A90E2" />
          <Text style={styles.iconButtonText}>Register</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleNavigate('/students')}>
          <Ionicons name="people" size={30} color="#4A90E2" />
          <Text style={styles.iconButtonText}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleNavigate('/attendance')}>
          <Ionicons name="list" size={30} color="#4A90E2" />
          <Text style={styles.iconButtonText}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleNavigate('/messages')}>
          <Ionicons name="chatbox" size={30} color="#4A90E2" />
          <Text style={styles.iconButtonText}>Messages</Text>
        </TouchableOpacity>
        {manualClockEnabled && (
          <TouchableOpacity style={styles.iconButton} onPress={() => handleNavigate('/manual')}>
            <Ionicons name="time" size={30} color="#4A90E2" />
            <Text style={styles.iconButtonText}>Manual Clock</Text>
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
  mainAction: {
    alignItems: 'center',
    marginBottom: 30,
  },
  goScanButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  goScanButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
    fontFamily: 'Poppins-Bold',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconButton: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  iconButtonText: {
    color: '#34495E',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
    fontFamily: 'Poppins-Medium',
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