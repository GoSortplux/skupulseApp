// app/students.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { router } from 'expo-router';
import { Student, getStudents, registerStudent, updateStudent, deleteStudent, importStudentsFromCSV, exportStudentsToExcel, resetStudentStatuses } from '../src/utils/storage';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StudentsScreen() {
  const { isAdmin } = useContext(AuthContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]); // For search results
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPhone2, setParentPhone2] = useState('');
  const [rfid, setRfid] = useState('');
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    fetchStudents();
  }, [isAdmin]);

  const fetchStudents = async () => {
    try {
      const fetchedStudents = await getStudents();
      setStudents(fetchedStudents);
      setFilteredStudents(fetchedStudents); // Initialize filtered list
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to fetch students');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredStudents(students);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(lowerQuery) ||
          student.rfid.toLowerCase().includes(lowerQuery) ||
          student.admissionNumber.toLowerCase().includes(lowerQuery)
      );
      setFilteredStudents(filtered);
    }
  };

  const handleAddOrUpdateStudent = async () => {
    if (!name || !admissionNumber || !parentPhone || !rfid) {
      setError('All fields are required');
      return;
    }

    if (!/^\d{10}$/.test(parentPhone) || (parentPhone2 && !/^\d{10}$/.test(parentPhone2))) {
      setError('Parent phone number must be 10 digits');
      return;
    }

    try {
      const student: Student = { rfid, name, admissionNumber, parentPhone, parentPhone2: parentPhone2 || undefined, lastEvent: null };
      if (editStudent) {
        await updateStudent(rfid, student);
        Alert.alert('Success', 'Student updated successfully!');
      } else {
        await registerStudent(student);
        Alert.alert('Success', 'Student registered successfully!');
      }
      setName('');
      setAdmissionNumber('');
      setParentPhone('');
      setParentPhone2('');
      setRfid('');
      setEditStudent(null);
      setError(null);
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
    }
  };

  const handleEdit = (student: Student) => {
    setEditStudent(student);
    setName(student.name);
    setAdmissionNumber(student.admissionNumber);
    setParentPhone(student.parentPhone);
    setParentPhone2(student.parentPhone2 || '');
    setRfid(student.rfid);
  };

  const handleDelete = (rfid: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this student?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudent(rfid);
            fetchStudents();
            Alert.alert('Success', 'Student deleted successfully!');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete student');
          }
        },
      },
    ]);
  };

  const handleDeleteAllStudents = () => {
    Alert.alert('Confirm Delete All', 'Are you sure you want to delete all students?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.setItem('@skupulseApp:students', JSON.stringify([]));
            setStudents([]);
            setFilteredStudents([]);
            Alert.alert('Success', 'All students deleted successfully!');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete all students');
          }
        },
      },
    ]);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      await importStudentsFromCSV(uri);
      fetchStudents();
      Alert.alert('Success', 'Students imported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import students');
    }
  };

  const handleExport = async () => {
    try {
      await exportStudentsToExcel();
      Alert.alert('Success', 'Students exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export students');
    }
  };

  const handleResetStatuses = async () => {
    try {
      await resetStudentStatuses();
      await AsyncStorage.removeItem('@skupulseApp:lastResetTimestamp');
      fetchStudents();
      Alert.alert('Success', 'Student statuses reset successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset statuses');
    }
  };

  const toggleSelectStudent = (rfid: string) => {
    setSelectedStudents((prev) =>
      prev.includes(rfid) ? prev.filter((id) => id !== rfid) : [...prev, rfid]
    );
  };

  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) {
      Alert.alert('No Selection', 'Please select students to delete.');
      return;
    }

    Alert.alert('Confirm Bulk Delete', `Are you sure you want to delete ${selectedStudents.length} student(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const rfid of selectedStudents) {
              await deleteStudent(rfid);
            }
            setSelectedStudents([]);
            setIsSelecting(false);
            fetchStudents();
            Alert.alert('Success', 'Selected students deleted successfully!');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete students');
          }
        },
      },
    ]);
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <View style={styles.studentItem}>
      {isSelecting && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelectStudent(item.rfid)}
        >
          <Text>{selectedStudents.includes(item.rfid) ? '☑' : '☐'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.studentInfo}>
        <Text style={styles.studentText}>Name: {item.name}</Text>
        <Text style={styles.studentText}>Admission: {item.admissionNumber}</Text>
        <Text style={styles.studentText}>Parent Phone: {item.parentPhone}</Text>
        {item.parentPhone2 && <Text style={styles.studentText}>Parent Phone 2: {item.parentPhone2}</Text>}
        <Text style={styles.studentText}>RFID: {item.rfid}</Text>
        {item.lastEvent && (
          <Text style={styles.studentText}>
            Last Event: {item.lastEvent.event} at {new Date(item.lastEvent.timestamp).toLocaleString()}
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Edit" onPress={() => handleEdit(item)} color="#007AFF" />
        <Button title="Delete" onPress={() => handleDelete(item.rfid)} color="#FF3B30" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editStudent ? 'Edit Student' : 'Add Student'}</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Admission Number"
        value={admissionNumber}
        onChangeText={setAdmissionNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Parent Phone (10 digits)"
        value={parentPhone}
        onChangeText={setParentPhone}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Parent Phone 2 (optional, 10 digits)"
        value={parentPhone2}
        onChangeText={setParentPhone2}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="RFID"
        value={rfid}
        onChangeText={setRfid}
      />
      <Button
        title={editStudent ? 'Update Student' : 'Add Student'}
        onPress={handleAddOrUpdateStudent}
        color="#007AFF"
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Name, RFID, or Admission Number"
        value={searchQuery}
        onChangeText={handleSearch}
      />
      <View style={styles.actionButtons}>
        <Button title="Import CSV" onPress={handleImport} color="#34C759" />
        <Button title="Export Excel" onPress={handleExport} color="#5856D6" />
        <Button title="Reset Statuses" onPress={handleResetStatuses} color="#FF9500" />
        <Button
          title={isSelecting ? 'Cancel Selection' : 'Select for Bulk Delete'}
          onPress={() => {
            setIsSelecting(!isSelecting);
            setSelectedStudents([]);
          }}
          color={isSelecting ? '#FF3B30' : '#FF2D55'}
        />
        {isSelecting && selectedStudents.length > 0 && (
          <Button title="Delete Selected" onPress={handleBulkDelete} color="#FF3B30" />
        )}
        <Button title="Delete All Students" onPress={handleDeleteAllStudents} color="#FF3B30" />
      </View>
      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.rfid}
        style={styles.studentList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  searchInput: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  studentList: { marginTop: 20 },
  studentItem: { flexDirection: 'row', padding: 10, backgroundColor: '#e0e0e0', borderRadius: 5, marginBottom: 10, alignItems: 'center' },
  studentInfo: { flex: 1 },
  studentText: { fontSize: 16, marginBottom: 5 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: 150 },
  errorText: { color: 'red', marginBottom: 10, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginVertical: 10 },
  checkbox: { marginRight: 10 },
});