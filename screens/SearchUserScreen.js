import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
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
import { useFocusEffect } from '@react-navigation/native'; 
import { API_URL } from "@env";
import { Ionicons } from "@expo/vector-icons"; // If using Expo


export default function SearchUserScreen({ navigation }) {
  const [accountData, setAccountData] = useState(null);  
  const [userData, setUserData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const flatListRef = useRef(null);

  const getToken = async () => {
    return Platform.OS === "web"
      ? localStorage.getItem("token")
      : await AsyncStorage.getItem("token");
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
  
        try {
          // Step 1: Fetch account data
          const storedToken = await AsyncStorage.getItem("token");
          if (!storedToken) {
            console.error("Token is not available.");
            setLoading(false);
            return;
          }
  
          console.log("📡 Fetching account data...");
          const accountResponse = await axios.get(`${API_URL}/account`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
  
          if (accountResponse.data.user) {
            setAccountData(accountResponse.data.user); // Set accountData
  
            // Step 2: Fetch user data (only after accountData is set)
            console.log("📡 Fetching users...");
            const usersResponse = await axios.get(`${API_URL}/users`, {
              headers: { Authorization: `Bearer ${storedToken}`, "Content-Type": "application/json" },
            });
  
            if (usersResponse.data && Array.isArray(usersResponse.data.data)) {
              const allUsers = usersResponse.data.data;
  
              // Exclude the logged-in user using accountData
              const filteredUsers = allUsers.filter(user => user.username !== accountResponse.data.user.username);
  
              setUserData(filteredUsers);
              setFilteredData(filteredUsers); // Update the displayed list
            } else {
              console.error("Unexpected response format:", usersResponse.data);
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          if (error.response?.status === 401) {
            Alert.alert("Unauthorized", "Session expired or invalid token. Please log in again.");
            await AsyncStorage.removeItem("token");
            navigation.replace('Login');
          } else {
            Alert.alert("Error", error?.response?.data?.error || "Failed to fetch user data.");
          }
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, [navigation]) // Re-run when the page is focused
  );
 


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
      {/* Custom Header */}
      <View style={styles.headerContainer}>
                  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.headerText}>Search Users</Text>
                </View>


      {/* Search Bar*/}
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
  contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} 
  style={styles.flatList} // Remove the height restriction
  scrollEnabled={true} // Forces scrolling on web
  renderItem={({ item }) => (
    <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => navigation.navigate("OtherAccount", { item })}
              >
      <Text style={styles.nameText}>{item.firstname || "Unknown"} {item.lastname || ""}</Text>
      <Text style={styles.usernameText}>{item.username || "No username"}</Text>
    </TouchableOpacity>
  )}
/>
</View>
  );
};




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    paddingTop: Platform.OS === "web" ? 20 : 40,
    paddingHorizontal: Platform.OS === "web" ? 20 : 10,
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
  itemContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 15,
    marginBottom: 10,  // Reduce this
    elevation: 5,
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
});
