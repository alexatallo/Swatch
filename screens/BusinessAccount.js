import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from "react-native-vector-icons/Ionicons";
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

          if (response.data.user) setUserData(response.data.user);
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
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating business info:", error);
      Alert.alert("Error", "Failed to update business info.");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6e3b6e" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={Platform.OS === "web" ? { height: "100vh" } : null}
    >
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Business Settings</Text>
      </View>

      {/* Inventory Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('InventoryScreen')}
        style={styles.inventoryButton}
      >
        <Text style={styles.buttonText}>Manage Inventory</Text>
        <Feather name="box" size={20} color="#fff" style={styles.buttonIcon} />
      </TouchableOpacity>

      {/* User Info Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle-outline" size={24} color="#6e3b6e" />
          <Text style={styles.cardTitle}>User Information</Text>
        </View>
        {userData ? (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6e3b6e" />
              <Text style={styles.infoText}>Email: {userData.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#6e3b6e" />
              <Text style={styles.infoText}>Username: {userData.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#6e3b6e" />
              <Text style={styles.infoText}>First Name: {userData.firstname}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#6e3b6e" />
              <Text style={styles.infoText}>Last Name: {userData.lastname}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.errorText}>User data not available</Text>
        )}
      </View>

      {/* Business Info Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="business-outline" size={24} color="#6e3b6e" />
          <Text style={styles.cardTitle}>Business Information</Text>
          {!isEditing && businessData && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Feather name="edit-2" size={18} color="#6e3b6e" />
            </TouchableOpacity>
          )}
        </View>

        {businessData ? (
          !isEditing ? (
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={18} color="#6e3b6e" />
                <Text style={styles.infoText}>{businessData.businessName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#6e3b6e" />
                <Text style={styles.infoText}>{businessData.businessLocation}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={18} color="#6e3b6e" />
                <Text style={styles.infoText}>{businessData.website}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.editContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="briefcase-outline" size={18} color="#6e3b6e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={editableBusinessName}
                  onChangeText={setEditableBusinessName}
                  placeholder="Business Name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={18} color="#6e3b6e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={editableBusinessLocation}
                  onChangeText={setEditableBusinessLocation}
                  placeholder="Business Location"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="globe-outline" size={18} color="#6e3b6e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={editableWebsite}
                  onChangeText={setEditableWebsite}
                  placeholder="Website"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  onPress={() => setIsEditing(false)} 
                  style={[styles.actionButton, styles.cancelButton]}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleUpdateBusinessInfo} 
                  disabled={updating}
                  style={[styles.actionButton, styles.saveButton]}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          <Text style={styles.errorText}>Business data not available</Text>
        )}
      </View>
      <View style={styles.logoutButtonContainer}>
  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
    <Text style={styles.logoutText}>Log Out</Text>
  </TouchableOpacity>
</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
    marginTop: Platform.OS === "ios" ? 10 : 0,  
  },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    padding: 8,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6e3b6e',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6e3b6e',
    marginLeft: 10,
  },
  editButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  infoContainer: {
    paddingHorizontal: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
  editContainer: {
    paddingHorizontal: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#6e3b6e',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryButton: {
    backgroundColor: '#6e3b6e',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  logoutButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 15,
    paddingHorizontal: 15,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});