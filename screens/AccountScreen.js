import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import axios from 'axios';
import { API_URL } from "@env"; 

// Use localStorage for web if needed
const Storage = Platform.OS === 'web' ? localStorage : AsyncStorage;

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [editableBusinessName, setEditableBusinessName] = useState('');
  const [editableBusinessLocation, setEditableBusinessLocation] = useState('');
  const [editableWebsite, setEditableWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New state for edit mode
  const [collectionData, setCollectionData] = useState(null);

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

        console.log('User data:', response.data.user);
        console.log('Business data:', response.data.business);
        console.log('Collection data', response.data.collection);

        if (response.data.user) {
          setUserData(response.data.user);
        } else {
          console.error("User data is missing.");
        }

        if (response.data.collection) {
          setCollectionData(response.data.collection);
        } else {
          console.error("Collection data is missing.");
        }

        if (response.data.business) {
          setBusinessData(response.data.business);
          setEditableBusinessName(response.data.business.businessName || '');
          setEditableBusinessLocation(response.data.business.businessLocation || '');
          setEditableWebsite(response.data.business.website || '');
        } else {
          setBusinessData(null);
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

    <Text style={styles.headerText}>Collections</Text>
          {collectionData ? (
            <View style={styles.collectionInfoContainer}>
              <Text style={styles.collectionInfoText}>Collections: {collectionData.name}</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Collection data not found.</Text>
          )}


      {businessData ? (
        <View style={styles.businessInfoContainer}>
          <View style={styles.businessHeaderRow}>
            <Text style={styles.businessTitle}>Business Info</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIcon}>
                <Feather name="edit" size={24} color="#A020F0" />
              </TouchableOpacity>
            )}
          </View>

          {!isEditing ? (
            <View style={styles.businessInfoRow}>
              <Text style={styles.businessText}>Business Name: {businessData.businessName}</Text>
              <Text style={styles.businessText}>Location: {businessData.businessLocation}</Text>
              <Text style={styles.businessText}>Website: {businessData.website}</Text>
            </View>
          ) : (
            <>
              <View style={styles.businessInfoRow}>
                <TextInput
                  style={styles.input}
                  value={editableBusinessName}
                  onChangeText={setEditableBusinessName}
                  placeholder="Edit Business Name"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.input}
                  value={editableBusinessLocation}
                  onChangeText={setEditableBusinessLocation}
                  placeholder="Edit Location"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.input}
                  value={editableWebsite}
                  onChangeText={setEditableWebsite}
                  placeholder="Edit Website"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.saveButtonContainer}>
                <TouchableOpacity onPress={handleUpdateBusinessInfo} disabled={updating} style={styles.saveIcon}>
                  {updating ? (
                    <ActivityIndicator size="small" color="#007BFF" />
                  ) : (
                    <Feather name="check" size={24} color="green" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    backgroundColor: '#f1f1f1',
  },
  headerText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  userInfoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  userInfoText: {
    fontSize: 18,
    color: '#555',
    marginVertical: 8,
  },
  collectionInfoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  collectionInfoText: {
    fontSize: 18,
    color: '#555',
    marginVertical: 8,
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
    position: 'relative', // Add relative positioning to allow absolute positioning of the icon
  },
  businessHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  businessTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  businessInfoRow: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  businessText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  editIcon: {
    padding: 10,
    borderRadius: 50,
    elevation: 5,
  },
  saveButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  saveIcon: {
    padding: 10,
    borderRadius: 50,
    elevation: 5,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    paddingLeft: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa', // Softer background for input fields
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#ff4c4c', // Red color for cancel button
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c', // Bright red for error messages
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
