// app/attendance.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert, TouchableOpacity, Platform } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { router } from 'expo-router';
import { AttendanceLog, getAttendanceLogs, deleteAttendanceLogs, deleteAllAttendanceLogs, exportAttendanceToExcel } from '../src/utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AttendanceScreen() {
  const { isAdmin } = useContext(AuthContext);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AttendanceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    fetchLogs();
  }, [isAdmin]);

  const fetchLogs = async () => {
    try {
      const fetchedLogs = await getAttendanceLogs();
      setLogs(fetchedLogs.sort((a, b) => b.timestamp - a.timestamp));
      filterLogsByDate(fetchedLogs, date);
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
      setError('Failed to fetch attendance logs');
    }
  };

  const filterLogsByDate = (logs: AttendanceLog[], selectedDate: Date) => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const filtered = logs.filter((log) => {
      const logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
      return logDateStr === selectedDateStr;
    });
    setFilteredLogs(filtered);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
    filterLogsByDate(logs, currentDate);
  };

  const handleExport = async () => {
    try {
      await exportAttendanceToExcel();
      Alert.alert('Success', 'Attendance logs exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export attendance logs');
    }
  };

  const handleDeleteAll = () => {
    Alert.alert('Confirm Delete All', 'Are you sure you want to delete all attendance logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAllAttendanceLogs();
            setLogs([]);
            setFilteredLogs([]);
            Alert.alert('Success', 'All attendance logs deleted successfully!');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete all logs');
          }
        },
      },
    ]);
  };

  const toggleSelectLog = (timestamp: number) => {
    setSelectedLogs((prev) =>
      prev.includes(timestamp) ? prev.filter((ts) => ts !== timestamp) : [...prev, timestamp]
    );
  };

  const handleBulkDelete = () => {
    if (selectedLogs.length === 0) {
      Alert.alert('No Selection', 'Please select logs to delete.');
      return;
    }

    Alert.alert('Confirm Bulk Delete', `Are you sure you want to delete ${selectedLogs.length} log(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAttendanceLogs(selectedLogs);
            setSelectedLogs([]);
            setIsSelecting(false);
            fetchLogs();
            Alert.alert('Success', 'Selected logs deleted successfully!');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete logs');
          }
        },
      },
    ]);
  };

  const renderLog = ({ item }: { item: AttendanceLog }) => (
    <View style={styles.logItem}>
      {isSelecting && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelectLog(item.timestamp)}
        >
          <Text>{selectedLogs.includes(item.timestamp) ? '☑' : '☐'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.logInfo}>
        <Text style={styles.logText}>Student: {item.studentName || 'Unknown'}</Text>
        <Text style={styles.logText}>RFID: {item.rfid}</Text>
        <Text style={styles.logText}>Event: {item.event}</Text>
        <Text style={styles.logText}>Manual: {item.manual ? 'Yes' : 'No'}</Text>
        <Text style={styles.logText}>
          Time: {new Date(item.timestamp).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Logs</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Date:</Text>
        <Button title={date.toLocaleDateString()} onPress={() => setShowDatePicker(true)} color="#007AFF" />
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>
      <View style={styles.actionButtons}>
        <Button title="Export to Excel" onPress={handleExport} color="#5856D6" />
        <Button title="Delete All Logs" onPress={handleDeleteAll} color="#FF3B30" />
        <Button
          title={isSelecting ? 'Cancel Selection' : 'Select for Bulk Delete'}
          onPress={() => {
            setIsSelecting(!isSelecting);
            setSelectedLogs([]);
          }}
          color={isSelecting ? '#FF3B30' : '#FF2D55'}
        />
        {isSelecting && selectedLogs.length > 0 && (
          <Button title="Delete Selected" onPress={handleBulkDelete} color="#FF3B30" />
        )}
      </View>
      {filteredLogs.length === 0 ? (
        <Text style={styles.noDataText}>No attendance logs for this date</Text>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLog}
          keyExtractor={(item) => item.timestamp.toString()}
          style={styles.logList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  logList: { marginTop: 10 },
  logItem: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderRadius: 5, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  logInfo: { flex: 1 },
  logText: { fontSize: 14, color: '#333', marginBottom: 5 },
  errorText: { color: 'red', marginBottom: 10, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 10 },
  noDataText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 20 },
  checkbox: { marginRight: 10 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  filterLabel: { fontSize: 16, marginRight: 10 },
});