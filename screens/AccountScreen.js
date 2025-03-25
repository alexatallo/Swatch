import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity,
  RefreshControl, Modal, StyleSheet, TouchableWithoutFeedback
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';

const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

const LOCAL_POSTS_KEY = "user_posts";

const AccountScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [databasePosts, setDatabasePosts] = useState([]);
  const [localPosts, setLocalPosts] = useState([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSelectedImageVisible, setIsSelectedImageVisible] = useState(false);
  const [lastTap, setLastTap] = useState(null);

  const loadUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("Token is missing.");
        setLoading(false);
        return;
      }

      const [userResponse, postsResponse] = await Promise.all([
        axios.get(`${API_URL}/account`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/posts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!isMounted.current) return;

      if (userResponse.data?.user) {
        setUser(userResponse.data.user);
      }

      const userPosts = postsResponse.data?.data?.filter(post => post.userId === userResponse.data.user._id) || [];
      setDatabasePosts(userPosts);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLocalPosts = async () => {
    try {
      const localPostsJSON = await AsyncStorage.getItem(LOCAL_POSTS_KEY);
      const storedPosts = localPostsJSON ? JSON.parse(localPostsJSON) : [];
      setLocalPosts(storedPosts);
    } catch (error) {
      console.error("Error loading local posts:", error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
  }, []);

  const handleImagePress = useCallback((post) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      if (post?.photoUri) {
        setSelectedImage(post);
        setIsSelectedImageVisible(true);
      }
    } else {
      setLastTap(now);
    }
  }, [lastTap]);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      loadUserData();
      loadLocalPosts();
      return () => {
        isMounted.current = false;
      };
    }, [])
  );

  const mergedPosts = useMemo(() => {
    const allPosts = [...localPosts, ...databasePosts];
    const uniquePosts = allPosts.reduce((acc, post) => {
      if (!acc.find(p => p._id === post._id)) {
        acc.push(post);
      }
      return acc;
    }, []);
    return uniquePosts;
  }, [localPosts, databasePosts]);

  const polishLookup = useMemo(() => {
    const map = {};
    mergedPosts.forEach(post => {
      if (post.polishId && post.polish) {
        map[post.polishId] = post.polish;
      }
    });
    return map;
  }, [mergedPosts]);

  const deletePost = async (postId) => {
    setPostToDelete(postId);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirmation = async () => {
    try {
      const token = await getToken();
      if (!token) {
        alert("Authentication token missing.");
        return;
      }
      await axios.delete(`${API_URL}/posts/${postToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatabasePosts(prev => prev.filter(post => post._id !== postToDelete));
      alert("Post deleted successfully!");
    } catch (err) {
      alert("Error deleting post.");
    } finally {
      setIsDeleteModalVisible(false);
      setPostToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
    setPostToDelete(null);
  };

  const handlePolishNamePress = (polishId) => {
    const item = polishLookup[polishId];
    if (item) {
      navigation.navigate("PolishScreen", { item });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#A020F0" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 50, right: 20, zIndex: 1 }}
        onPress={() => {
          if (user?.isBusiness) {
            navigation.navigate("BusinessAccount");
          } else {
            navigation.navigate("ClientAccount");
          }
        }}
      >
        <Ionicons name="settings-outline" size={28} color="black" />
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginTop: 60, marginBottom: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          {user?.username}
        </Text>
        <Text style={{ fontSize: 18, color: '#666' }}>
          {user?.isBusiness ? "Business Account" : "Personal Account"}
        </Text>
      </View>

      {mergedPosts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={mergedPosts}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <View style={{ position: "relative", alignItems: "center" }}>
              <View style={styles.postCard}>
                <Text style={styles.username}>@{item.username}</Text>
                <TouchableWithoutFeedback onPress={() => handleImagePress(item)}>
                  {item.photoUri ? (
                    <Image source={{ uri: item.photoUri }} style={styles.postImage} />
                  ) : (
                    <Text>No Image Available</Text>
                  )}
                </TouchableWithoutFeedback>
                <Text style={styles.postCaption}>{item.caption}</Text>
                <View style={styles.polishDetailsContainer}>
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: polishLookup[item.polishId]?.hex || "#ccc" },
                    ]}
                  />
                  <TouchableOpacity onPress={() => handlePolishNamePress(item.polishId)}>
                    <Text style={styles.postDetails}>
                      {polishLookup[item.polishId]?.brand || ""}: {polishLookup[item.polishId]?.name || "Unknown Polish"}
                    </Text>
                  </TouchableOpacity>
                  <Text> | 📍 {item.nailLocation}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.trashButton}
                onPress={() => deletePost(item._id)}
              >
                <Ionicons name="trash-outline" size={24} color="purple" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal transparent visible={isDeleteModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}>
              Are you sure you want to delete this post?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={handleDeleteCancel}>
                <Text style={{ color: "#6A5ACD" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteConfirmation}>
                <Text style={{ color: "red" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    width: "90%",
    alignSelf: "center",
  },
  postImage: {
    width: "100%",
    height: 350,
    borderRadius: 10,
    marginBottom: 15,
  },
  postCaption: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  username: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#6A5ACD",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    zIndex: 10,
  },
  polishDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  postDetails: {
    fontSize: 16,
    color: "#666",
    marginRight: 5,
  },
  trashButton: {
    position: "absolute",
    bottom: 20,
    right: 45,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 1)",
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AccountScreen;