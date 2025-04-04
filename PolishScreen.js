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
  FlatList,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "@env";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width } = Dimensions.get("window");

// Helper functions
const getToken = async () => await AsyncStorage.getItem("token");

export const fetchUserById = async (userId) => {
  try {
    console.log(`[fetchUserById] Starting fetch for user ${userId}`);
    const token = await AsyncStorage.getItem('token');
    console.log('[fetchUserById] Token retrieved');
    
    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('[fetchUserById] Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('[fetchUserById] Error:', {
      message: error.message,
      response: error.response?.data,
      config: error.config
    });
    throw error;
  }
};
// Sub-components
const BusinessList = ({ businesses, loading, navigation }) => {
 
    const handleBusinessPress = async (business) => {
      if (!business?.userId) {
        console.error('Business has no userId:', business);
        Alert.alert("Error", "This business has no associated user account");
        return;
      }
  
      try {
        console.log('Fetching user for ID:', business.userId);
        const user = await fetchUserById(business.userId);
        console.log('Fetched user:', user);
        
        if (user) {
          navigation.navigate('OtherAccount', { item: user });
        } else {
          Alert.alert("Error", "User not found");
        }
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert("Error", error.message || "Couldn't navigate to account");
      }
    };

  if (loading) return <ActivityIndicator size="small" color="#0000ff" />;
  if (businesses.length === 0) {
    return <Text style={styles.noBusinessesText}>Not currently available at any businesses</Text>;
  }

  return (
    <FlatList
      data={businesses}
      renderItem={({ item }) => (  // Changed from item: business to just item
        <TouchableOpacity 
          style={styles.businessUserItem}
          onPress={() => handleBusinessPress(item)}  // Now using the correct function
        >
          <Text style={styles.businessName}>
            {item.businessName || item.username}
          </Text>
          {item.businessName && (
            <Text style={styles.businessUsername}>@{item.username}</Text>
          )}
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item._id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.businessUsersList}
    />
  );
};

const CollectionModal = ({
  visible,
  onClose,
  collections,
  selectedId,
  onSelect,
  collectionName,
  onNameChange,
  isCreating,
  onCreate,
  loading,
}) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Save to Collection</Text>

        <TextInput
          style={styles.input}
          placeholder="Create new collection"
          value={collectionName}
          onChangeText={onNameChange}
        />

        {collections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Existing Collections</Text>
            <ScrollView style={styles.collectionList}>
              {collections.map((collection) => (
                <TouchableOpacity
                  key={collection._id}
                  style={[
                    styles.collectionItem,
                    collection._id === selectedId && styles.selectedCollection,
                  ]}
                  onPress={() => onSelect(collection._id)}
                >
                  <Text style={styles.collectionName}>{collection.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          style={styles.modalButton}
          onPress={onCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.modalButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Main component
export default function PolishScreen({ route }) {
  const { item } = route.params;
  const navigation = useNavigation();

  // State
  const [businessUsers, setBusinessUsers] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [userCollections, setUserCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const getUserById = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  };

  // Data fetching
  const fetchBusinessUsersWithPolish = async () => {
    setLoadingBusinesses(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/api/polishes/${item._id}/businesses`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (response.data.status === "okay") {
        setBusinessUsers(response.data.data);
      } else {
        Alert.alert("Error", response.data.message || "No businesses found");
      }
    } catch (error) {
      Alert.alert(
        "Error", 
        error.response?.data?.message || 
        "Failed to load business data. Please try again."
      );
    } finally {
      setLoadingBusinesses(false);
    }
  };

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
        setUserCollections(response.data.filter(c => c.name !== "Inventory"));
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
  
      // CASE 1: Adding to existing collection
      if (selectedCollectionId) {
        const response = await axios.post(
          `${API_URL}/collections/${selectedCollectionId}/polishes`,
          { polishId: item._id },
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        Alert.alert("Success", "Polish saved to collection!");
        setModalVisible(false);
        return;
      }
  
      // CASE 2: Creating new collection
      if (collectionName.trim()) {
        // Create collection and add polish in one step
        const createResponse = await axios.post(
          `${API_URL}/collections`,
          { 
            name: collectionName.trim(),
            polishes: [item._id] // Add the polish immediately
          },
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        Alert.alert("Success", `Created "${collectionName}" and added polish!`);
        setModalVisible(false);
        setCollectionName("");
        fetchCollections(); // Refresh the collections list
        return;
      }
  
      Alert.alert("Error", "Please select or create a collection");
  
    } catch (error) {
      console.error("Save error details:", {
        message: error.message,
        response: error.response?.data,
        config: error.config
      });
      
      let errorMessage = "Failed to save. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("400")) {
        errorMessage = "Invalid request. Please check your input.";
      }
  
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Effects
  useEffect(() => {
    fetchCollections();
    fetchBusinessUsersWithPolish();
  }, []);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Error: Polish data not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
  style={styles.container}
  contentContainerStyle={{ flexGrow: 1 }}
> 
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Polish Details</Text>
      </View>

      {/* Main content */}
      <View style={[styles.content, styles.contentContainer]}>
        {/* Polish image with shadow */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.picture }} 
            style={styles.image} 
            resizeMode="contain"
          />
        </View>

        {/* Polish details */}
        <View style={styles.detailsCard}>
          <Text style={styles.title}>{item.name || "No name available"}</Text>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="branding-watermark" size={18} color="#6C63FF" />
            <Text style={styles.detailText}>{item.brand || "Unknown brand"}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="collections" size={18} color="#6C63FF" />
            <Text style={styles.detailText}>{item.collection || "Unknown collection"}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={18} color="#6C63FF" />
            <Text style={styles.detailText}>{item.type || "Unknown type"}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {item.link && (
              <TouchableOpacity 
                style={[styles.button, styles.buyButton]}
                onPress={() => Linking.openURL(item.link)}
              >
                <Text style={styles.buttonText}>Buy Now</Text>
                <MaterialIcons name="shopping-cart" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.buttonText}>Save to Collection</Text>
              <MaterialIcons name="bookmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Available at businesses section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available At</Text>
          {loadingBusinesses ? (
            <ActivityIndicator size="large" color="#6C63FF" />
          ) : businessUsers.length > 0 ? (
            <BusinessList 
  businesses={businessUsers}
  loading={loadingBusinesses}
  navigation={navigation}
/>
          ) : (
            <Text style={styles.emptyText}>Not currently available at any businesses</Text>
          )}
        </View>
      </View>

      {/* Collection Modal */}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cancelText: { fontSize: 18, marginTop: 15, color: "#007BFF" },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  contentContainer: {
    flex: 1,
    minHeight: Dimensions.get('window').height,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#6C63FF",
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 15,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#555",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
  },
  buyButton: {
    backgroundColor: "#FF6584",
  },
  saveButton: {
    backgroundColor: "#6C63FF",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginRight: 5,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  businessList: {
    paddingBottom: 10,
  },
  businessCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    alignItems: "center",
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  businessAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  businessName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 15, width: 320, alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  input: { width: "100%", borderColor: "#ddd", borderWidth: 1, padding: 10, borderRadius: 5, marginBottom: 15 },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  collectionList: { width: "100%", maxHeight: 200 },
  collectionItem: { padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: "#f1f1f1" },
  selectedCollection: { backgroundColor: "#A020F0" },
  collectionName: {
    marginLeft: 10,
    fontSize: 16,
    color: "#555",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  confirmButton: {
    backgroundColor: "#6C63FF",
  },
  modalButton: { backgroundColor: "#5D3FD3", padding: 12, borderRadius: 8, width: "100%", alignItems: "center" },
  modalButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelText: { fontSize: 18, marginTop: 15, color: "#007BFF" },
});