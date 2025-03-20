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
            collections.add(item.collection || "Uncategorized"); // Handle missing collection names
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

            // Assuming the collection name is "Inventory"
            const collectionName = "Inventory";

            // Post the polish ID directly to the inventory collection
            await axios.post(
                `${API_URL}/inventory`,
                { polishId: item._id }, // Single polish ID
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

            // Fetch polishes associated with the collection
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

            // Ensure correct field names when sending data
            const collectionData = {
                collectionName: collectionName, // Match backend expected field
                polishes: polishIds // Backend expects "polishes", not "polishIds"
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
            // If no search, show full list
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
        applyFilters(text); // Use the latest search input
    };

    const clearFilters = () => {
        setSearchQuery("");
        setFilteredPolishes(polishData);
        flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    }




    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#A020F0" style={{ marginTop: 20 }} />
            ) : polishData.length === 0 ? (
                <Text style={styles.emptyText}>No polishes found.</Text>
            ) : (
                <>
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>

                    {/* Header */}
                    <Text style={styles.headerText}>Inventory</Text>

                    {/* View Collections Button */}
                    <TouchableOpacity
                        style={styles.collectionButton}
                        onPress={() => {
                            setSelectedCollection(null);
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.buttonText}>View Collections</Text>
                    </TouchableOpacity>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search polish name..."
                                placeholderTextColor="#888"
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                        </View>

                        {/* Clear Filters Button (Outside the search container) */}
                        {(searchQuery) && (
                            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                                <Text style={styles.clearButtonText}>Clear Filters</Text>
                            </TouchableOpacity>
                        )}

                    {/* Polish List */}
                    <FlatList
                        ref={flatListRef}
                        data={filteredPolishes}
                        keyExtractor={(item, index) =>
                            item._id ? item._id.toString() : index.toString()
                        }
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={[styles.listContainer, { flexGrow: 1 }]} // Enable scrolling
                        style={styles.flatList} // Add fixed height for web
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.itemContainer}
                                onPress={() => navigation.navigate("PolishScreen", { item })}
                            >
                                <Image source={{ uri: item.picture }} style={styles.image} />
                                <Text style={styles.nameText}>{item.name || "No name"}</Text>
                                <Text style={styles.brandText}>{item.brand || "Unknown brand"}</Text>
                                {/* Add Button */}
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => handleAddPolishToInventory(item)}
                                >
                                    <Ionicons name="add-circle" size={30} color="#A020F0" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    />
                </>
            )}

            {/* Modal for Collections */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedCollection ? (
                            <>
                                <Text style={styles.modalTitle}>{selectedCollection}</Text>
                                <FlatList
                                    data={filteredPolishes}
                                    keyExtractor={(item) => item._id.toString()}
                                    renderItem={({ item }) => (
                                        <View style={styles.polishCard}>
                                            <Image source={{ uri: item.picture }} style={styles.image} />
                                            <View style={styles.textContainer}>
                                                <Text style={styles.title}>{item.name || "No name available"}</Text>
                                                <Text style={styles.text}>Brand: {item.brand || "Unknown"}</Text>
                                                <Text style={styles.text}>Finish: {item.finish || "Unknown"}</Text>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => addCollectionToInventory(selectedCollection, filteredPolishes)}
                                            >
                                                <Ionicons name="add-circle" size={30} color="#A020F0" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                                <Button title="Back to Collections" onPress={() => setSelectedCollection(null)} />
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Select a Collection</Text>
                                <FlatList
                                    data={getUniqueCollections()}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.collectionItem}
                                            onPress={() => handleCollectionPress(item)}
                                        >
                                            <Text style={styles.collectionText}>{item}</Text>
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => addCollectionToInventory(item, polishData.filter(polish => polish.collection === item))}
                                            >
                                                <Ionicons name="add-circle" size={30} color="#A020F0" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    )}
                                />
                            </>
                        )}

                        {/* Close Button */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FAF9FE",
        paddingTop: Platform.OS === 'web' ? 20 : 40,
        paddingHorizontal: Platform.OS === 'web' ? 20 : 10,
    },
    flatList: {
        height: Platform.OS === 'web' ? '70vh' : undefined, // Fixed height for web
    },
    collectionButton: {
        backgroundColor: "#A020F0",
        paddingVertical: 12,
        borderRadius: 12,
        margin: 15,
        alignItems: "center",
    },
    itemContainer: {
        width: '48%',
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    row: {
        justifyContent: "space-between",
    },
    listContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    backButton: {
        marginBottom: 10,
        padding: 10,
        alignSelf: "flex-start",
    },
    headerText: {
        fontSize: 26,
        fontWeight: "700",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    polishCard: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 15,
        margin: 10,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginBottom: 10,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
    },
    text: {
        fontSize: 14,
        color: "#555",
    },
    addButton: {
        padding: 5,
    },
    emptyText: {
        textAlign: "center",
        fontSize: 16,
        color: "#666",
        marginTop: 20,
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
        borderRadius: 10,
        width: Platform.OS === 'web' ? '40%' : '80%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#6A0DAD",
        textAlign: "center",
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: "#D8BFD8",
        marginBottom: 15,
    },
    nameText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        textAlign: "center",
    },
    brandText: {
        fontSize: 14,
        color: "#555",
        textAlign: "center",
    },
    collectionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginVertical: 6,
        backgroundColor: "#F0E6FA",
        borderRadius: 12,
    },
    collectionText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#4B0082",
    },
    closeButton: {
        backgroundColor: "#A020F0",
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    /** Search Bar **/
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 15,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    clearButton: {
        alignSelf: "center",
        backgroundColor: "#E0E0E0",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 5,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    clearButtonText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "bold",
    },
});

export default InventoryScreen;