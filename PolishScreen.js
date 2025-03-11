import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  TextInput,
  FlatList,
  Button,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "@env";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getToken = async () => {
  const token = await AsyncStorage.getItem("token");
  return token;
};

export default function PolishScreen({ route }) {
  const { item } = route.params;
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [userCollections, setUserCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isCollectionsVisible, setIsCollectionsVisible] = useState(false);

  const fetchCollections = async (pageNum = 1, limit = 10) => {
    if (loading) return;
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        alert("Please log in to continue.");
        return;
      }

      const response = await axios.get(`${API_URL}/collections`, {
        params: { page: pageNum, limit },
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(response.data); // Check the structure of the responses


      if (Array.isArray(response.data)) {
        setUserCollections(response.data);
      } else {
        console.error("Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCollections(1, 10);
  }, []);

  const handleSaveToCollection = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        console.log("No token found");
        return;
      }

      let collectionId;
      let collectionNameToSend;

      if (collectionName.trim()) {
        // Create a new collection
        const response = await axios.post(
          `${API_URL}/collections`,
          { collectionName: collectionName.trim(), polishId: item._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        collectionId = response.data._id; // Get the ID of the new collection
        collectionNameToSend = response.data.name; // Collection name of the newly created collection
      } else if (selectedCollectionId) {
        // Use the selected existing collection
        const selectedCollection = userCollections.find(
          (collection) => collection._id === selectedCollectionId
        );
        collectionId = selectedCollection._id;
        collectionNameToSend = selectedCollection.name; // Get the name of the selected collection
      } else {
        Alert.alert("Error", "Please select or create a collection.");
        setLoading(false);
        return;
      }

      // Now save the polish to the selected or newly created collection with both the collection name and polish ID
      const polishResponse = await axios.post(
        `${API_URL}/collections`,  // Ensure this is the correct endpoint for saving polish to collection
        { collectionId, collectionName: collectionNameToSend, polishId: item._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Polish saved to collection!");
    } catch (error) {
      console.error("Error saving polish:", error);
      Alert.alert("Error", "Failed to save polish to collection.");
    } finally {
      setLoading(false);
      setModalVisible(false);
    }
  };


  const renderCollectionOption = ({ item }) => (
    <TouchableOpacity
      style={styles.collectionOption}
      onPress={() => handleSaveToCollection(item._id)} // Pass collection ID when clicked
    >
      <Text style={styles.collectionName}>{item.name}</Text>
    </TouchableOpacity>
  );



  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Nail Polish Details */}
      <Image source={{ uri: item.picture }} style={styles.image} />
      <Text style={styles.title}>{item.name || "No name available"}</Text>
      <Text style={styles.text}>Brand: {item.brand || "Unknown brand"}</Text>
      <Text style={styles.text}>Color: {item.color || "Unknown color"}</Text>

      {/* Buy Button */}
      {item.link && (
        <TouchableOpacity style={styles.buyButton} onPress={() => Linking.openURL(item.link)}>
          <Text style={styles.buyButtonText}>Buy</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => {
          setModalVisible(true); // Show the modal when clicking "Save to Collection"
        }}
      >
        <Text style={styles.saveButtonText}>Save to Collection</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save to Collection</Text>

            {/* Option to Create New Collection */}
            <TouchableOpacity
              style={styles.createNewButton}
              onPress={() => {
                setIsCreatingCollection(true); // User wants to create a new collection
                setSelectedCollectionId(null); // Ensure no collection is selected
                setIsCollectionsVisible(false); // Hide existing collections if creating a new one
                setCollectionName(''); // Clear the name input field
              }}
            >
              <Text style={styles.createNewButtonText}>Create New Collection</Text>
            </TouchableOpacity>

            {/* Option to Select Existing Collection */}
            <TouchableOpacity
              style={styles.selectExistingButton}
              onPress={() => {
                setIsCreatingCollection(false); // User wants to select an existing collection
                setIsCollectionsVisible(!isCollectionsVisible); // Toggle collection visibility
                setSelectedCollectionId(null); // Ensure no collection is selected initially
                setCollectionName(''); // Clear the name input field
              }}
            >
              <Text style={styles.selectExistingButtonText}>Select Existing Collection</Text>
            </TouchableOpacity>

            {/* If Creating Collection, Show Input Field */}
            {isCreatingCollection && (
              <TextInput
                style={styles.input}
                placeholder="Enter collection name"
                value={collectionName}
                onChangeText={setCollectionName}
              />
            )}

            {/* Collection Info Section */}
            {isCollectionsVisible && !isCreatingCollection ? (
              Array.isArray(userCollections) && userCollections.length > 0 ? (
                userCollections.map((collection) => (
                  <TouchableOpacity
                    key={collection._id}
                    style={[
                      styles.collectionCard,
                      collection._id === selectedCollectionId && styles.selectedCollection,
                    ]}
                    onPress={() => {
                      setSelectedCollectionId(collection._id); // Set the collection ID
                      setCollectionName(''); // Clear the name input field when selecting an existing collection
                    }}
                  >
                    <Text style={styles.collectionName}>{collection.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.errorText}>No collections available.</Text>
              )
            ) : null}

            {/* Save Button */}
            <Button
              title={loading ? "Saving..." : "Save"}
              onPress={() => {
                handleSaveToCollection();
                setCollectionName(''); // Clear the name input field after saving
              }}
              disabled={loading || (!selectedCollectionId && isCreatingCollection && !collectionName)} // Disable until valid collection or collection name
            />

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setCollectionName(''); // Clear the name input field when cancelling
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: "#007BFF",
    fontWeight: "bold",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    marginBottom: 5,
  },
  buyButton: {
    marginTop: 20,
    backgroundColor: "purple",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "green",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: 300,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
    borderRadius: 5,
  },
  collectionOption: {
    paddingVertical: 10,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  collectionName: {
    fontSize: 18,
  },
  createNewButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  createNewButtonText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  selectExistingButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectExistingButtonText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  cancelText: {
    fontSize: 18,
    textAlign: "center",
    color: "#007BFF",
    marginTop: 10,
  },
  selectedCollection: {
    backgroundColor: "#FFD700", // Highlight color for selected collection
  },
});