import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, FlatList, TouchableOpacity,
  StyleSheet, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';

const FollowerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [followers, setFollowers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userId } = route.params;

  const getToken = async () => {
    return await AsyncStorage.getItem("token");
  };

  const fetchCurrentUser = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.user) {
        setCurrentUserId(response.data.user._id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/users/${userId}/followers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.data) {
        setFollowers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchFollowers();
  }, [userId]);

  const handleUserPress = (user) => {
    if (user._id === currentUserId) {
      // Navigate to Main stack which contains our tabs, then to Account tab
      navigation.navigate('Main', { screen: 'Account' });
    } else {
      navigation.navigate("OtherAccount", { item: user });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A020F0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() => handleUserPress(item)}
            >
              <Text style={styles.nameText}>{item.firstname || "User"} {item.lastname || ""}</Text>
              <Text style={styles.usernameText}>@{item.username || "username"}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    paddingTop: Platform.OS === "web" ? 20 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  itemContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  listContainer: {
    paddingHorizontal: 20,
  },
});

export default FollowerScreen;