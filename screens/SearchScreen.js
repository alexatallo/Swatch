import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Image, FlatList, Platform } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";


const getToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  }
  return await AsyncStorage.getItem("token");
};


export default function SearchScreen() {
  const [imageData, setImageData] = useState([]); // State for image data
  const [loading, setLoading] = useState(true); // State for loading indicator


  useEffect(() => {
    const fetchPicture = async () => {
      try {
        const token = await getToken();
        console.log("Stored Token:", token);
 
        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }
 
        console.log("Sending request to /polishes");
        const response = await axios.get("http://35.50.84.107:5000/polishes", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
 
        console.log(response, "polishdata");
        console.log("Frontend Response Data:", response.data); // Log the entire response
 
        if (response.data && Array.isArray(response.data.data)) {
          setImageData(response.data.data); // If it's already an array, use it as is
        } else if (response.data && typeof response.data === "object") {
          setImageData([response.data]); // Wrap single object in an array
        } else {
          console.error("Unexpected response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
 
    fetchPicture();
  }, []);
 


  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }


  return (
    <View style={styles.container}>
      <FlatList
        data={imageData} // ✅ Fixed: Use correct state
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Image source={{ uri: item.picture }} style={styles.image} />
          </View>
        )}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  itemContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
});


