import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    Button,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const getToken = async () => {
    return Platform.OS === "web"
        ? localStorage.getItem("token")
        : await AsyncStorage.getItem("token");
};

const InventoryScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [polishData, setPolishData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [filteredPolishes, setFilteredPolishes] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const flatListRef = useRef(null);

    useEffect(() => {
        const fetchPolishes = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    console.error("Token is missing.");
                    setLoading(false);
                    return;
                }

                console.log("📡 Fetching polishes...");
                const response = await axios.get(`${API_URL}/polishes`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.data.status === "okay" && Array.isArray(response.data.data)) {
                    setPolishData(response.data.data);
                    setFilteredPolishes(response.data.data);
                } else {
                    console.error("Unexpected response format:", response.data);
                }
            } catch (error) {
                console.error("Error fetching polish data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPolishes();
    }, [navigation]);

    const getUniqueCollections = () => {
        const collections = new Set();
        polishData.forEach((item) => {
            collections.add(item.collection || "Uncategorized"); 
        });
        return Array.from(collections);
    };

    const handleCollectionPress = (collection) => {
        setSelectedCollection(collection);
        setFilteredPolishes(
            polishData.filter((polish) => (polish.collection || "Uncategorized") === collection)
        );
        setModalVisible(true);
    };

    const handleAddPolishToInventory = async (item) => {
        if (loading) return;
        setLoading(true);

        try {
            const token = await getToken();
            if (!token) {
                Alert.alert("Error", "Please log in to continue.");
                return;
            }

           
            const collectionName = "Inventory";

           
            await axios.post(
                `${API_URL}/inventory`,
                { polishId: item._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Alert.alert("Success", "Polish saved to Inventory!");
        } catch (error) {
            console.error("Error saving polish to Inventory:", error);
            Alert.alert("Error", "Failed to save polish to Inventory.");
        } finally {
            setLoading(false);
            setModalVisible(false);
        }
    };

    const addCollectionToInventory = async (collectionName) => {
        try {
            const token = await getToken();
            if (!token) {
                Alert.alert("Error", "Please log in to continue.");
                return;
            }

          
            const polishResponse = await axios.get(`${API_URL}/polishes?collection=${collectionName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!polishResponse.data || !Array.isArray(polishResponse.data.data) || polishResponse.data.data.length === 0) {
                Alert.alert("Error", "No polishes found for this collection.");
                return;
            }

            const polishIds = polishResponse.data.data.map(polish => polish._id);

            if (polishIds.length === 0) {
                Alert.alert("Error", "No polish IDs associated with this collection.");
                return;
            }

            const collectionData = {
                collectionName: collectionName, 
                polishes: polishIds 
            };

            const response = await axios.post(
                `${API_URL}/inventory/collections`,
                collectionData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.status === 201) {
                Alert.alert("Success", "Collection added to Inventory!");
            } else {
                Alert.alert("Error", "Failed to add collection to Inventory.");
            }
        } catch (error) {
            console.error("Error adding collection to Inventory:", error);
            Alert.alert("Error", "Failed to add collection to Inventory.");
        }
    };

    
    const applyFilters = useCallback(
        (search = searchQuery) => {
            
            if (!search) {
                setFilteredPolishes(polishData);
                return;
            }
            let filtered = polishData;
            if (search) {
                filtered = filtered.filter((item) =>
                    item.name.toLowerCase().includes(search.toLowerCase())
                );
            }
            setFilteredPolishes(filtered);
            flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
        },
        [searchQuery, polishData]
    )


    const handleSearch = (text) => {
        setSearchQuery(text);
        applyFilters(text);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setFilteredPolishes(polishData);
        flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    }




    return (
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color="#E0E0E0" style={styles.loadingIndicator} />
          ) : polishData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sad-outline" size={50} color="#6e3b6e" />
              <Text style={styles.emptyText}>No polishes found</Text>
            </View>
          ) : (
            <>
             
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.collectionButton}
                  onPress={() => {
                    setSelectedCollection(null);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="folder-open-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Collections</Text>
                </TouchableOpacity>
    
              </View>
    
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#6e3b6e" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search polish name..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {searchQuery && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Ionicons name="close-circle" size={20} color="#6e3b6e" />
                  </TouchableOpacity>
                )}
              </View>
    
              {/* Polish List */}
              <FlatList
                ref={flatListRef}
                data={filteredPolishes}
                keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContainer}
                style={styles.flatList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.itemContainer}
                    onPress={() => navigation.navigate("PolishScreen", { item })}
                  >
                    <Image source={{ uri: item.picture }} style={styles.image} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.nameText} numberOfLines={1}>{item.name || "No name"}</Text>
                      <Text style={styles.brandText} numberOfLines={1}>{item.brand || "Unknown brand"}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addItemButton}
                      onPress={() => handleAddPolishToInventory(item)}
                    >
                      <Ionicons name="add-circle" size={30} color="#6e3b6e" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={40} color="#6e3b6e" />
                    <Text style={styles.noResultsText}>No results found</Text>
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                      <Text style={styles.clearButtonText}>Clear search</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </>
          )}
    
          {/* Collections Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedCollection ? selectedCollection : 'Select a Collection'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6e3b6e" />
                  </TouchableOpacity>
                </View>
    
                {selectedCollection ? (
                  <>
                    <FlatList
                      data={filteredPolishes}
                      keyExtractor={(item) => item._id.toString()}
                      renderItem={({ item }) => (
                        <View style={styles.polishCard}>
                          <Image source={{ uri: item.picture }} style={styles.modalImage} />
                          <View style={styles.textContainer}>
                            <Text style={styles.title}>{item.name || "No name available"}</Text>
                            <Text style={styles.text}>Brand: {item.brand || "Unknown"}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.addItemButton}
                            onPress={() => addCollectionToInventory(selectedCollection, filteredPolishes)}
                          >
                            <Ionicons name="add-circle" size={30} color="#6e3b6e" />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    <TouchableOpacity 
                      style={styles.backButtonModal}
                      onPress={() => setSelectedCollection(null)}
                    >
                      <Text style={styles.backButtonText}>Back to Collections</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <FlatList
                    data={getUniqueCollections()}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.collectionItem}
                        onPress={() => handleCollectionPress(item)}
                      >
                        <Ionicons name="folder-outline" size={20} color="#6e3b6e" />
                        <Text style={styles.collectionText}>{item}</Text>
                        <TouchableOpacity
                          style={styles.addItemButton}
                          onPress={() => addCollectionToInventory(item, polishData.filter(polish => polish.collection === item))}
                        >
                          <Ionicons name="add-circle" size={30} color="#6e3b6e" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>
        </View>
      );
    };
    
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingTop: Platform.OS === 'web' ? 20 : 40,
        paddingHorizontal: 16,
      },
      loadingIndicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      emptyText: {
        fontSize: 18,
        color: '#6e3b6e',
        marginTop: 10,
      },
      headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
      },
      backButton: {
        padding: 8,
        marginRight: 10,
      },
      headerText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#6e3b6e',
        flex: 1,
        textAlign: 'center',
      },
      actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
      },
      collectionButton: {
        backgroundColor: "#6e3b6e",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
      },
      addButton: {
        backgroundColor: "#6e3b6e",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
      },
      buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
      searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
        paddingHorizontal: 10,
      },
      flatList: {
        height: Platform.OS === 'web' ? '70vh' : undefined,
      },
      row: {
        justifyContent: 'space-between',
        paddingHorizontal: 4,
      },
      listContainer: {
        paddingBottom: 20,
      },
      itemContainer: {
        width: '48%',
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      itemInfo: {
        marginTop: 8,
      },
      image: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        resizeMode: 'cover',
      },
      nameText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
      },
      brandText: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
      },
      addItemButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
      },
      noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      },
      noResultsText: {
        fontSize: 18,
        color: '#6e3b6e',
        marginVertical: 10,
      },
      clearButton: {
        backgroundColor: "#6e3b6e",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginTop: 10,
      },
      clearButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
      },
      modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
      modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
        width: Platform.OS === 'web' ? '40%' : '90%',
        maxHeight: '80%',
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#6e3b6e",
      },
      polishCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
      modalImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
      },
      textContainer: {
        flex: 1,
      },
      title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
      },
      text: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
      },
      collectionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginVertical: 6,
        backgroundColor: "#f0e6ff",
        borderRadius: 10,
      },
      collectionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#6e3b6e",
        marginLeft: 10,
      },
      backButtonModal: {
        backgroundColor: "#6e3b6e",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 15,
      },
      backButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
      },
    });
    
    export default InventoryScreen;