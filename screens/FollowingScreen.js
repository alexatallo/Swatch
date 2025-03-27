// FollowingScreen.js

import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';

const FollowingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = route.params;

  const getToken = async () => {
    return await AsyncStorage.getItem("token");
  };

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const token = await getToken();
        const response = await axios.get(`${API_URL}/users/${userId}/following`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data?.data) {
          setFollowing(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching following:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A020F0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Following</Text>
      </View>

      {following.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Not following anyone yet</Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() => navigation.navigate("OtherAccount", { item })}
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
  // Same styles as FollowerScreen
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

export default FollowingScreen;
