import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  FlatList,
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

const CollectionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { collectionId } = route.params;
  const [polishData, setPolishData] = useState([]);
  const [loading, setLoading] = useState(true);
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

        console.log("📡 Fetching polishes for collection...");
        const response = await axios.get(
          `${API_URL}/collections/${collectionId}/polishes`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

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
  }, [collectionId]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#A020F0" style={{ marginTop: 20 }} />
      ) : polishData.length === 0 ? (
        <Text style={styles.emptyText}>No polishes found in this collection.</Text>
      ) : (
        <>
          {/* Header and Back Button */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Your Collection</Text>
          </View>

          {/* Polish List */}
          <FlatList
            data={polishData}
            keyExtractor={(item) => item._id.toString()}
            contentContainerStyle={[styles.listContainer, { flexGrow: 1 }]}
            style={[styles.flatList, Platform.OS === "web" ? { height: "calc(100vh - 150px)" } : null]} 
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
              </View>
            )}
          />
        </>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: "#F8F8F8",
  paddingTop: Platform.OS === "web" ? 20 : 40,
  paddingHorizontal: Platform.OS === "web" ? 20 : 10,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  flatList: {
    height: Platform.OS === 'web' ? '70vh' : undefined, // Fixed height for web
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
});

export default CollectionScreen;