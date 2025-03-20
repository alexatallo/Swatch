import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import { useLayoutEffect } from "react";
import { Ionicons } from "@expo/vector-icons"; // If using Expo


const {height } = Dimensions.get("window");



export default function SearchUserScreen({ navigation }) {
  const [userData, setUserData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }
        console.log("📡 Fetching useres...");
        const response = await axios.get(`${API_URL}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.data && Array.isArray(response.data.data)) {
          setUserData(response.data.data);
          setFilteredData(response.data.data);
        } else {
          console.error("Unexpected response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [navigation]);


  const clearFilters = () => {
    setSearchQuery("");
    setFilteredData(userData);
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };


  //applyfilters
  const applyFilters = useCallback(
    (search = searchQuery) => {
      if (!search) {
        setFilteredData([...userData]); // Create a new array instead of modifying the original
        return;
      }
  
      const filtered = userData.filter((item) =>
        (item.username || "").toLowerCase().includes(search.toLowerCase())
      );
  
      setFilteredData(filtered);
      flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    },
    [searchQuery, userData]
  );
  


  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(text); // Use the latest search input
  };


  if (loading) {
    return <ActivityIndicator size="large" color="#5D3FD3" />;
  }


  return (
    <View style={styles.container}>
      {/* Search Bar & Color Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search username..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>


      {/* Clear Filters Button (Outside the search container) */}
      {(searchQuery) && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Search</Text>
        </TouchableOpacity>
      )}


<FlatList
  ref={flatListRef}
  data={filteredData}
  keyExtractor={(item, index) =>
    item._id ? item._id.toString() : index.toString()
  }
  numColumns={1}
  windowSize={10}
  initialNumToRender={10}
  contentContainerStyle={{ flexGrow: 1 }} // Ensures scrolling on web
  scrollEnabled={true} // Forces scrolling on web
  renderItem={({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.nameText}>{item.firstname || "Unknown"} {item.lastname || ""}</Text>
      <Text style={styles.usernameText}>{item.username || "No username"}</Text>
    </View>
  )}
/>



    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#F8F8F8",
  },
  /** Search Bar & Color Button **/
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
  colorButton: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
    shadowColor: "#5D3FD3",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  itemContainer: {
    flexDirection: "column", // Stack items vertically
    alignItems: "flex-start", // Align text to the left
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
  },
  usernameText: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
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
  backButton: {
    marginLeft: 15,
    padding: 10,
  },
});

