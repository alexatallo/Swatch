import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Image, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from 'axios';
import { API_URL } from "@env";

export default function ClientAccount({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const storedToken = await AsyncStorage.getItem("token");
          if (!storedToken) {
            console.error("Token is not available.");
            setLoading(false);
            return;
          }

          console.log("📡 Fetching user data...");
          const response = await axios.get(`${API_URL}/account`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          console.log("Full API Response:", response.data);

          if (response.data.user) {
            setUserData(response.data.user);
          } else {
            console.error("User data not found.");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (error.response?.status === 401) {
            Alert.alert("Unauthorized", "Session expired or invalid token. Please log in again.");
            await AsyncStorage.removeItem("token");
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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };


  const handleProfilePicUpload = async () => {
    try {

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera roll is required!');
        return;
      }

    
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], 
        quality: 0.7,    
      });

      if (!result.canceled && result.assets[0].uri) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E0E0E0" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={Platform.OS === "web" ? { height: "100vh" } : null}
    >

      <View style={styles.profileContainer}>
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={handleProfilePicUpload}>
            <View style={styles.profilePicContainer}>
              {userData?.profilePic ? (
                <Image
                  source={{ uri: userData.profilePic }}
                  style={styles.profilePic}
                />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Ionicons name="person" size={40} color="white" />
                </View>
              )}
              <View style={styles.editProfilePicIcon}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>



   
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
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6e3b6e',
    textAlign: 'center',
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  profilePicContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6e3b6e',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    backgroundColor: '#6e3b6e',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfilePicIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6e3b6e',
    borderRadius: 12,
    padding: 4,
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