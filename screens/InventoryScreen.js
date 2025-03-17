import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Linking,
    FlatList,
    Modal,
    Button,
    Platform,
    ActivityIndicator,
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
    const [selectedCollection, setSelectedCollection] = useState("");
    const [filteredPolishes, setFilteredPolishes] = useState([]);

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

    const handleAddPolish = (polish) => {
        console.log("Add Polish:", polish);
        // Logic to add polish to a collection or navigate to a different screen
    };

    const handleAddCollection = (collection) => {
        console.log("Add Collection:", collection);
        // Logic to add a new collection
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#A020F0" style={{ marginTop: 20 }} />
            ) : polishData.length === 0 ? (
                <Text style={styles.emptyText}>No polishes found.</Text>
            ) : (
                <>
                    {/* Button to show collections */}
                    <TouchableOpacity
                        style={styles.collectionButton}
                        onPress={() => {
                            setSelectedCollection(null); 
                            setModalVisible(true); 
                        }}
                    >
                        <Text style={styles.buttonText}>View Collections</Text>
                    </TouchableOpacity>

                    {/* FlatList to show all polishes */}
                    <FlatList
                        data={polishData}
                        keyExtractor={(item) => item._id.toString()}
                        contentContainerStyle={styles.listContainer}
                        style={styles.flatList}
                        ListHeaderComponent={
                            <>
                                {/* Back Button */}
                                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                    <Ionicons name="arrow-back" size={28} color="#333" />
                                </TouchableOpacity>

                                {/* Header */}
                                <Text style={styles.headerText}>Your Collection</Text>
                            </>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.polishCard}>
                                <Image source={{ uri: item.picture }} style={styles.image} />
                                <View style={styles.textContainer}>
                                    <Text style={styles.title}>{item.name || "No name available"}</Text>
                                    <Text style={styles.text}>Brand: {item.brand || "Unknown"}</Text>
                                    <Text style={styles.text}>Finish: {item.finish || "Unknown"}</Text>
                                    <Text style={styles.text}>Type: {item.type || "Unknown"}</Text>
                                    <Text style={styles.text}>Hex: {item.hex || "Unknown"}</Text>

                                    {item.link && (
                                        <TouchableOpacity style={styles.buyButton} onPress={() => Linking.openURL(item.link)}>
                                            <Text style={styles.buyButtonText}>Buy Now</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Add icon for each polish item */}
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => handleAddPolish(item)}
                                >
                                    <Ionicons name="add-circle" size={30} color="#A020F0" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </>
            )}

            {/* Modal to show collection details */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
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
                                                <Text style={styles.text}>Type: {item.type || "Unknown"}</Text>
                                                <Text style={styles.text}>Hex: {item.hex || "Unknown"}</Text>
                                            </View>

                                            {/* Add icon for each polish in collection */}
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => handleAddPolish(item)}
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

                                            {/* Add icon for each collection */}
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => handleAddCollection(item)}
                                            >
                                                <Ionicons name="add-circle" size={30} color="#A020F0" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    )}
                                />
                                <Button title="Close" onPress={() => setModalVisible(false)} />
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8",
        paddingTop: 40,
    },
    collectionButton: {
        backgroundColor: "#A020F0",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        margin: 10,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    flatList: {
        flex: 1,
        marginTop: 20,
    },
    listContainer: {
        paddingHorizontal: 20,
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
        marginBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 10,
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    text: {
        fontSize: 14,
        color: "#555",
        marginBottom: 3,
    },
    buyButton: {
        marginTop: 8,
        backgroundColor: "#A020F0",
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
        width: 120,
    },
    buyButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    emptyText: {
        textAlign: "center",
        fontSize: 16,
        color: "#666",
        marginTop: 20,
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
        width: "80%",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#333",
        marginBottom: 15,
        textAlign: "center",
    },
    collectionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        alignItems: "center",
    },
    collectionText: {
        fontSize: 18,
        fontWeight: "600",
    },
    addButton: {
        marginLeft: 10,
    },
});

export default InventoryScreen;