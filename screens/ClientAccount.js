import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from 'axios';
import { API_URL } from "@env";

const Storage = AsyncStorage;

export default function ClientAccount({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [collectionData, setCollectionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);

 
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

          console.log("📡 Fetching user data...");
          const response = await axios.get(`${API_URL}/account`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          console.log("Full API Response:", response.data);

          if (response.data.user) setUserData(response.data.user);
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

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const deleteCollection = async (postId) => {
    setCollectionToDelete(postId);
    setIsDeleteModalVisible(true);  // Show delete confirmation modal
  };

  const handleDeleteConfirmation = async () => {
    if (!collectionToDelete) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alert("Authentication token missing.");
        return;
      }

      const response = await axios.delete(`${API_URL}/collection/${collectionToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        alert("Collection deleted successfully!");

        // Update state to remove deleted collection
        setCollectionData(prevCollections => prevCollections.filter(col => col._id !== collectionToDelete));
      } else {
        throw new Error("Failed to delete collection");
      }
    } catch (error) {
      alert("Error deleting collection: " + (error.response?.data?.error || error.message));
    }

    setIsDeleteModalVisible(false);
    setCollectionToDelete(null);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
    setCollectionToDelete(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>User Profile</Text>

      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
 
      {userData ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>User Info</Text>
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
            {/* Trash Icon */}
            <TouchableOpacity
              style={styles.trashButton}
              onPress={() => deleteCollection(collection._id)}
            >
              <Ionicons name="trash-outline" size={24} color="purple" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.errorText}>No collections found.</Text>
      )}
      {/* Delete Confirmation Modal */}
      <Modal transparent visible={isDeleteModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Collection?</Text>
            <Text style={styles.modalMessage}>This action cannot be undone.</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleDeleteCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConfirmation}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  backButton: { position: "absolute", top: 40, left: 20, padding: 10 },
  backButtonText: { fontSize: 18, color: "#007BFF", fontWeight: "bold" },
  headerText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 15,
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  userInfoText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 10,
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
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%", // Fixed modal height
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalMessage: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ccc",
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  deleteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#A020F0", // Purple delete button
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});