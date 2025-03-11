import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import axios from 'axios';
import { API_URL } from "@env";

// Use localStorage for web if needed
const Storage = Platform.OS === 'web' ? localStorage : AsyncStorage;

export default function BusinessAccount({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [editableBusinessName, setEditableBusinessName] = useState('');
  const [editableBusinessLocation, setEditableBusinessLocation] = useState('');
  const [editableWebsite, setEditableWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New state for edit mode


  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = await Storage.getItem("token");
        if (!storedToken) {
          console.error("Token is not available.");
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/account`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        console.log("Full API Response:", response.data); // Log the full response

        if (response.data.user) {
            setUserData(response.data.user);
          }
  
          if (response.data.business) {
            setBusinessData(response.data.business);
            setEditableBusinessName(response.data.business.businessName || '');
            setEditableBusinessLocation(response.data.business.businessLocation || '');
            setEditableWebsite(response.data.business.website || '');
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

  const handleUpdateBusinessInfo = async () => {
    if (!editableBusinessName.trim() || !editableBusinessLocation.trim() || !editableWebsite.trim()) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setUpdating(true);
    try {
      const storedToken = await Storage.getItem("token");
      await axios.put(`${API_URL}/account/business`,
        {
          businessName: editableBusinessName,
          businessLocation: editableBusinessLocation,
          website: editableWebsite
        },
        {
          headers: { Authorization: `Bearer ${storedToken}` },
        }
      );

      // Update business data locally
      setBusinessData({
        ...businessData,
        businessName: editableBusinessName,
        businessLocation: editableBusinessLocation,
        website: editableWebsite,
      });

      Alert.alert("Success", "Business info updated successfully.");
      setIsEditing(false); // Exit edit mode
    } catch (error) {
      console.error("Error updating business info:", error);
      Alert.alert("Error", "Failed to update business info.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>User Profile</Text>

      {/* User Info Section */}
      {userData ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>Email: {userData.email}</Text>
            <Text style={styles.userInfoText}>Username: {userData.username}</Text>
            <Text style={styles.userInfoText}>First Name: {userData.firstname}</Text>
            <Text style={styles.userInfoText}>Last Name: {userData.lastname}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>User data not found.</Text>
      )}

      {/* Business Info Section */}
      {businessData ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.businessInfoContainer}>
            {!isEditing ? (
              <>
                <Text style={styles.businessText}>Business Name: {businessData.businessName}</Text>
                <Text style={styles.businessText}>Location: {businessData.businessLocation}</Text>
                <Text style={styles.businessText}>Website: {businessData.website}</Text>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                  <Feather name="edit" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={editableBusinessName}
                  onChangeText={setEditableBusinessName}
                  placeholder="Edit Business Name"
                  placeholderTextColor="#bdc3c7"
                />
                <TextInput
                  style={styles.input}
                  value={editableBusinessLocation}
                  onChangeText={setEditableBusinessLocation}
                  placeholder="Edit Location"
                  placeholderTextColor="#bdc3c7"
                />
                <TextInput
                  style={styles.input}
                  value={editableWebsite}
                  onChangeText={setEditableWebsite}
                  placeholder="Edit Website"
                  placeholderTextColor="#bdc3c7"
                />
                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity onPress={handleUpdateBusinessInfo} disabled={updating} style={styles.saveButton}>
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="check" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>Business data not found.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  headerText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 25,
  },
  sectionContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 10,
  },
  userInfoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  userInfoText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  businessInfoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  businessText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#3498db',
    borderRadius: 50,
    padding: 10,
    elevation: 5,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingLeft: 15,
    fontSize: 16,
    backgroundColor: '#f1f1f1',
    color: '#2c3e50',
  },
  saveButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    borderRadius: 50,
    padding: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 50,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});