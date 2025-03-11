import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, FlatList, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '@env'; // Import the API_URL from the .env file
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure you import AsyncStorage
import { Ionicons } from '@expo/vector-icons'; // Add icon library

const getToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  }
  return await AsyncStorage.getItem("token");
};

const CollectionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { collectionId } = route.params; // Get the collection ID from the route params
  const [polishData, setPolishData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolishes = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }
  
        console.log("📡 Sending request to fetch polishes for collection...");
        const response = await axios.get(`${API_URL}/collections/${collectionId}/polishes`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
  
        console.log("🔍 Full API Response:", response.data);
  
        // Check if the response has data and if it's in the correct format
        if (response.data.status === "okay" && Array.isArray(response.data.data)) {
          setPolishData(response.data.data); // Set polish data from the collection array
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

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()} // Navigate back to the previous screen (ClientAccount)
      >
        <Ionicons name="arrow-back" size={30} color="#333" />
      </TouchableOpacity>

      <FlatList
        data={polishData}
        keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
        renderItem={({ item }) => (
          <View style={styles.polishContainer}>
            <Image source={{ uri: item.picture }} style={styles.image} />
            <Text style={styles.title}>{item.name || "No name available"}</Text>
            <Text style={styles.text}>Brand: {item.brand || "Unknown brand"}</Text>
            <Text style={styles.text}>Color Family: {item['color family'] || "Unknown color family"}</Text>
            <Text style={styles.text}>Finish: {item.finish || "Unknown finish"}</Text>
            <Text style={styles.text}>Type: {item.type || "Unknown type"}</Text>
            <Text style={styles.text}>Hex: {item.hex || "Unknown hex value"}</Text>

            {/* Buy Button */}
            {item.link && (
              <TouchableOpacity style={styles.buyButton} onPress={() => Linking.openURL(item.link)}>
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: '#f1f1f1',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  polishContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  text: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  buyButton: {
    backgroundColor: '#A020F0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default CollectionScreen;