import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Use localStorage for web if needed
const Storage = Platform.OS === 'web' ? localStorage : AsyncStorage;

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [businessData, setBusinessData] = useState(null); // New state for business data
  const [editableBusinessName, setEditableBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false); // Track if updating

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = await Storage.getItem("token");

        if (!storedToken) {
          console.error("Token is not available.");
          setLoading(false);
          return;
        }

        const response = await axios.get("http://35.50.71.204:5000/account", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        // Log the API response to help debug
        console.log('User data:', response.data.user); // Log user data
        console.log('Business data:', response.data.business); // Log business data

        if (response.data.user) {
          setUserData(response.data.user);
        } else {
          console.error("User data is missing.");
        }

        if (response.data.business) {
          setBusinessData(response.data.business);
          setEditableBusinessName(response.data.business.businessName || ''); // Set the editable business name
        } else {
          setBusinessData(null); // Set to null if no business data
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.response?.status === 401) {
          Alert.alert("Unauthorized", "Session expired or invalid token. Please log in again.");
          await Storage.removeItem("token");
          navigation.replace('Login');
        } else {
          Alert.alert("Error", error?.response?.data?.error || "Failed to fetch user data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUpdateBusinessName = async () => {
    if (!editableBusinessName.trim()) {
      Alert.alert("Error", "Business name cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      const storedToken = await Storage.getItem("token");
      const response = await axios.put("http://35.50.71.204:5000/account/business", 
        { businessName: editableBusinessName },
        {
          headers: { Authorization: `Bearer ${storedToken}` },
        }
      );

      setBusinessData(response.data.business); // Update the business data in state
      Alert.alert("Success", "Business name updated successfully.");
    } catch (error) {
      console.error("Error updating business name:", error);
      Alert.alert("Error", "Failed to update business name.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>User Info</Text>
      {userData ? (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userInfoText}>Email: {userData.email}</Text>
          <Text style={styles.userInfoText}>Username: {userData.username}</Text>
          <Text style={styles.userInfoText}>First Name: {userData.firstname}</Text>
          <Text style={styles.userInfoText}>Last Name: {userData.lastname}</Text>
        </View>
      ) : (
        <Text style={styles.errorText}>User data not found.</Text>
      )}

      {businessData ? (
        <View style={styles.businessInfoContainer}>
          <Text style={styles.businessTitle}>Business Info</Text>
          <Text style={styles.businessText}>Business Name: {businessData.businessName}</Text>
          <Text style={styles.businessText}>Location: {businessData.businessLocation}</Text>
          <Text style={styles.businessText}>Website: {businessData.website}</Text>

          <TextInput
            style={styles.input}
            value={editableBusinessName}
            onChangeText={setEditableBusinessName}
            placeholder="Edit Business Name"
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={handleUpdateBusinessName} disabled={updating} style={[styles.button, updating && styles.buttonDisabled]}>
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Business Name</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.errorText}>Business data not found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  userInfoText: {
    fontSize: 16,
    color: '#555',
    marginVertical: 5,
  },
  businessInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  businessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  businessText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  input: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingLeft: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A3D1FF',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
  },
});