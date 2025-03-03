import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Use localStorage for web if needed
const Storage = Platform.OS === 'web' ? localStorage : AsyncStorage;

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = await Storage.getItem("token"); // Use Storage instead of AsyncStorage
        console.log("Stored Token:", storedToken);  // Check if token is present

        if (!storedToken) {
          console.error("Token is not available.");
          setLoading(false);
          return;
        }

        console.log("Token used in request:", storedToken); // Check token in request

        const response = await axios.get("http://35.50.71.204:5000/account", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        console.log('Response Data:', response.data);
        
        // Assuming the backend sends user data in a "user" property
        setUserData(response.data.user);
      } catch (error) {
        console.error("Error fetching user data:", error);

        // Handle token expiration error (401 Unauthorized)
        if (error.response?.status === 401) {
          Alert.alert("Unauthorized", "Session expired or invalid token. Please log in again.");
          
          // Remove expired token from storage
          await Storage.removeItem("token");

          // Redirect to the login screen
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Information</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6200ea" />
      ) : userData ? (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userInfoText}>Username: <Text style={styles.userInfoValue}>{userData.username}</Text></Text>
          <Text style={styles.userInfoText}>Email: <Text style={styles.userInfoValue}>{userData.email}</Text></Text>
          <Text style={styles.userInfoText}>First Name: <Text style={styles.userInfoValue}>{userData.firstname}</Text></Text>
          <Text style={styles.userInfoText}>Last Name: <Text style={styles.userInfoValue}>{userData.lastname}</Text></Text>
        </View>
      ) : (
        <Text style={styles.noDataText}>No user data available.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6200ea',
    marginBottom: 30,
  },
  userInfoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  userInfoText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
  },
  userInfoValue: {
    fontWeight: '500',
    color: '#6200ea',
  },
  noDataText: {
    fontSize: 16,
    color: 'gray',
    fontStyle: 'italic',
  },
});