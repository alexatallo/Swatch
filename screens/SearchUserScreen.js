import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from "@env";
import { Ionicons } from "@expo/vector-icons";

export default function SearchUserScreen({ navigation }) {
  // State management
  const [state, setState] = useState({
    accountData: null,
    userData: [],
    filteredData: [],
    loading: true,
    searchQuery: "",
    showBusinessOnly: false
  });

  const flatListRef = useRef(null);

  // Token handling
  const getToken = async () => {
    return Platform.OS === "web"
      ? localStorage.getItem("token")
      : await AsyncStorage.getItem("token");
  };

  // Navigation setup
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Filter function
  const applyFilters = useCallback(() => {
    let filtered = [...state.userData];
    
    // Apply search filter
    if (state.searchQuery) {
      filtered = filtered.filter((item) =>
        (item.username || "").toLowerCase().includes(state.searchQuery.toLowerCase())
      );
    }
    
    // Apply business filter
    if (state.showBusinessOnly) {
      filtered = filtered.filter((item) => item.isBusiness === true);
    }
    
    setState(prev => ({
      ...prev,
      filteredData: filtered
    }));
    
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  }, [state.userData, state.searchQuery, state.showBusinessOnly]);

  // Data fetching
  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const token = await getToken();
      
      if (!token) {
        console.error("Token is not available.");
        Alert.alert("Error", "Authentication required");
        return;
      }

      // Fetch account and users in parallel
      const [accountResponse, usersResponse] = await Promise.all([
        axios.get(`${API_URL}/account`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/users`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json" 
          }
        })
      ]);

      if (usersResponse.data?.data && Array.isArray(usersResponse.data.data)) {
        const allUsers = usersResponse.data.data;
        const filteredUsers = allUsers.filter(user => 
          user.username !== accountResponse.data?.user?.username
        );

        setState(prev => ({
          ...prev,
          accountData: accountResponse.data?.user,
          userData: filteredUsers,
          filteredData: filteredUsers,
          loading: false
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again");
        await AsyncStorage.removeItem("token");
        navigation.replace('Login');
      } else {
        Alert.alert("Error", error?.response?.data?.error || "Failed to fetch data");
      }
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Focus effect for data refresh
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Apply filters when search criteria changes
  useEffect(() => {
    applyFilters();
  }, [state.searchQuery, state.showBusinessOnly, applyFilters]);

  // Handlers
  const handleSearch = (text) => {
    setState(prev => ({ ...prev, searchQuery: text }));
  };

  const handleBusinessToggle = () => {
    setState(prev => ({ 
      ...prev, 
      showBusinessOnly: !prev.showBusinessOnly 
    }));
  };

  const clearFilters = () => {
    setState(prev => ({
      ...prev,
      searchQuery: "",
      showBusinessOnly: false,
      filteredData: prev.userData
    }));
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  // Loading state
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D3FD3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Search Users</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search username..."
          placeholderTextColor="#888"
          value={state.searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={handleBusinessToggle}
          style={[
            styles.businessFilterButton,
            state.showBusinessOnly && styles.businessFilterButtonActive
          ]}
        >
          <Ionicons
            name={state.showBusinessOnly ? "business" : "business-outline"}
            size={24}
            color={state.showBusinessOnly ? "#5D3FD3" : "#888"}
          />
        </TouchableOpacity>
      </View>

      {/* Clear Filters Button */}
      {(state.searchQuery || state.showBusinessOnly) && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}

      {/* User List */}
      <FlatList
        ref={flatListRef}
        data={state.filteredData}
        keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
        initialNumToRender={10}
        windowSize={10}
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => navigation.navigate("OtherAccount", { item })}
          >
            <View style={styles.itemContent}>
              <View style={styles.textContainer}>
                <Text style={styles.nameText}>
                  {item.firstname || "Unknown"} {item.lastname || ""}
                </Text>
                <Text style={styles.usernameText}>
                  @{item.username || "No username"}
                </Text>
              </View>
              {item.isBusiness && (
                <View style={styles.businessIconContainer}>
                  <Ionicons name="business" size={20} color="#5D3FD3" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {state.searchQuery 
                ? "No users match your search" 
                : "No users found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    paddingTop: Platform.OS === "ios" ? 60 : 40, // Increased padding for iOS
    paddingHorizontal: Platform.OS === "web" ? 20 : 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
    marginTop: Platform.OS === "ios" ? 10 : 0,  
  },
  backButton: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: 'center',
    marginRight: 34,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  businessFilterButton: {
    marginLeft: 10,
    padding: 5,
  },
  businessFilterButtonActive: {
    backgroundColor: "#F0E8FF",
    borderRadius: 20,
  },
  clearButton: {
    alignSelf: "center",
    backgroundColor: "#E0E0E0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
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
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 50,
    paddingHorizontal: 10
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  usernameText: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  businessIconContainer: {
    marginLeft: 10,
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  }
});