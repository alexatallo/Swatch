import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // 🔹 Import useFocusEffect
import Feather from 'react-native-vector-icons/Feather';
import axios from 'axios';
import { API_URL } from "@env";

const Storage = AsyncStorage;

export default function BusinessAccount({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [editableBusinessName, setEditableBusinessName] = useState('');
  const [editableBusinessLocation, setEditableBusinessLocation] = useState('');
  const [editableWebsite, setEditableWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [collectionData, setCollectionData] = useState([]);


  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        setLoading(true);
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

          console.log("📡 Full API Response:", response.data);

          if (response.data.user) setUserData(response.data.user);
          if (response.data.business) {
            setBusinessData(response.data.business);
            setEditableBusinessName(response.data.business.businessName || '');
            setEditableBusinessLocation(response.data.business.businessLocation || '');
            setEditableWebsite(response.data.business.website || '');
          }
          if (Array.isArray(response.data.collection)) {
            setCollectionData(response.data.collection);
          } else {
            console.error("Collection data not found or invalid:", response.data.collection);
            setCollectionData([]);
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
    }, [])
  );

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

      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Custom Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('InventoryScreen')}
        style={styles.inventoryButton}>
        <Text style={styles.buttonText}>Inventory</Text>
      </TouchableOpacity>

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


      {Array.isArray(collectionData) && collectionData.length > 0 ? (
        collectionData.map((collection, index) => (
          <TouchableOpacity
            key={index}
            style={styles.collectionCard}
            onPress={() => navigation.navigate('CollectionScreen', { collectionId: collection._id })}
          >
            <Text style={styles.collectionName}>{collection.name}</Text>
            <Text style={styles.collectionDescription}>Click to view details</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.errorText}>No collections found.</Text>
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
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f7f7f7' },
  backButton: { position: "absolute", top: 40, left: 20, padding: 10 },
  backButtonText: { fontSize: 18, color: "#007BFF", fontWeight: "bold" },
  headerText: { fontSize: 36, fontWeight: '700', color: '#2c3e50', textAlign: 'center', marginBottom: 25 },
  sectionContainer: { marginBottom: 40 },
  sectionTitle: { fontSize: 24, fontWeight: '600', color: '#34495e', marginBottom: 10 },
  userInfoContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, elevation: 8 },
  userInfoText: { fontSize: 16, color: '#7f8c8d', marginBottom: 8 },
  businessInfoContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, elevation: 8 },
  businessText: { fontSize: 16, color: '#7f8c8d', marginBottom: 12 },
  editButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#3498db', borderRadius: 50, padding: 10, elevation: 5 },
  inventoryButton: {
    backgroundColor: "#8e44ad",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  collectionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 15,
  },
  collectionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34495e',
  },
  collectionDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  input: { height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingLeft: 15 },
});

