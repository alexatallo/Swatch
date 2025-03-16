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
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "@env";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export default function PolishScreen({ route }) {
  console.log("Route Params:", route.params);
  const { item } = route.params;
  
  const navigation = useNavigation();

  // State
  const [modalVisible, setModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [userCollections, setUserCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Error: Polish data not found.</Text>
      </View>
    );
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "Please log in to continue.");
        return;
      }

      const response = await axios.get(`${API_URL}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(response.data)) {
        setUserCollections(response.data);
      } else {
        console.error("Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "Please log in to continue.");
        return;
      }

      let collectionIdToUse = selectedCollectionId;

      if (isCreatingCollection && collectionName.trim()) {
        const createResponse = await axios.post(
          `${API_URL}/collections`,
          { collectionName: collectionName.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        collectionIdToUse = createResponse.data._id;
      }

      if (collectionIdToUse) {
        await axios.post(
          `${API_URL}/collections/${collectionIdToUse}/polishes`,
          { polishId: item._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        Alert.alert("Success", "Polish saved to collection!");
      } else {
        Alert.alert("Error", "Please select or create a collection.");
      }
    } catch (error) {
      console.error("Error saving polish:", error);
      Alert.alert("Error", "Failed to save polish to collection.");
    } finally {
      setLoading(false);
      setModalVisible(false);
      fetchCollections();
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Main Content */}
      <View style={styles.content}>
        <Image source={{ uri: item.picture }} style={styles.image} />
        <Text style={styles.title}>{item.name || "No name available"}</Text>
        <Text style={styles.text}>Brand: {item.brand || "Unknown brand"}</Text>
        <Text style={styles.text}>Collection: {item.collection || "Unknown collection"}</Text>
        <Text style={styles.text}>Type: {item.type || "Unknown type"}</Text>

        {item.link && (
          <TouchableOpacity style={styles.buyButton} onPress={() => Linking.openURL(item.link)}>
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.saveButtonText}>Save to Collection</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save to Collection</Text>

            <TextInput
              style={styles.input}
              placeholder="Create new collection"
              value={collectionName}
              onChangeText={(text) => {
                setCollectionName(text);
                setIsCreatingCollection(text.trim().length > 0);
                setSelectedCollectionId(null);
              }}
            />

            {userCollections.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Existing Collections</Text>
                <ScrollView style={styles.collectionList}>
                  {userCollections.map((collection) => (
                    <TouchableOpacity
                      key={collection._id}
                      style={[
                        styles.collectionItem,
                        collection._id === selectedCollectionId && styles.selectedCollection,
                      ]}
                      onPress={() => {
                        setSelectedCollectionId(collection._id);
                        setCollectionName("");
                        setIsCreatingCollection(false);
                      }}
                    >
                      <Text style={styles.collectionName}>{collection.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveToCollection}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Save</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  backButton: { position: "absolute", top: 40, left: 20, padding: 10 },
  backButtonText: { fontSize: 18, color: "#007BFF", fontWeight: "bold" },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 20 },
  image: { width: 220, height: 220, borderRadius: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  text: { fontSize: 18, textAlign: "center", marginBottom: 5 },
  buyButton: { backgroundColor: "purple", padding: 15, borderRadius: 10, marginTop: 15, width: 200, alignItems: "center" },
  buyButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  saveButton: { backgroundColor: "green", padding: 15, borderRadius: 10, marginTop: 15, width: 200, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 15, width: 320, alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  input: { width: "100%", borderColor: "#ddd", borderWidth: 1, padding: 10, borderRadius: 5, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 10, marginBottom: 5, alignSelf: "flex-start" },
  collectionList: { width: "100%", maxHeight: 200 },
  collectionItem: { padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: "#f1f1f1" },
  selectedCollection: { backgroundColor: "#A020F0" },
  modalButton: { backgroundColor: "#5D3FD3", padding: 12, borderRadius: 8, width: "100%", alignItems: "center" },
  modalButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelText: { fontSize: 18, marginTop: 15, color: "#007BFF" },
});
