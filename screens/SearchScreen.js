import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  FlatList,
  Text,  // ✅ Import Text
  Platform
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";


const getToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  }
  return await AsyncStorage.getItem("token");
};


export default function SearchScreen() {
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


            console.log("📡 Sending request to /polishes...");
            const response = await axios.get("http://35.50.90.208:5000/polishes", {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });


            console.log("🔍 Full API Response:", response.data);


            if (response.data && Array.isArray(response.data.data)) {
              setPolishData(
                response.data.data);
               // If it's already an array, use it as is
            } else if (response.data && typeof response.data === "object") {
              setPolishData([response.data]); // Wrap single object in an array
            } else {
              console.error("Unexpected response format:", response.data);
            }
          } catch (error) {
            console.error("Error fetching data:", error);
          } finally {
            setLoading(false);
          }
        };
   


    fetchPolishes();
}, []);




  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }


  return (
    <View style={styles.container}>
      <FlatList
        data={polishData}
        keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Image source={{ uri: item.picture }} style={styles.image} />
            {/* ✅ Ensure 'name' and 'brand' are wrapped in <Text> */}
            <Text style={styles.nameText}>{item.name || "No name available"}</Text>
            <Text style={styles.brandText}>{item.brand || "Unknown brand"}</Text>
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
  nameText: {  // ✅ Styling for the Name
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  brandText: {  // ✅ Styling for the Brand
    fontSize: 14,
    color: "gray",
  },
});

