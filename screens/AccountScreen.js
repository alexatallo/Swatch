import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity,
  RefreshControl, Modal, StyleSheet, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { API_URL } from '@env';

const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.log("No token found in AsyncStorage");
      return null;
    }
    return token;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

const LOCAL_POSTS_KEY = "user_posts";

const AccountScreen = () => {
  const navigation = useNavigation();
  const [polishData, setPolishData] = useState([]);
  const [businessData, setBusinessData] = useState([]);
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
  const [followersCount, setFollowersCount] = useState(0);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);


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
        fetchFollowersCount(userResponse.data.user._id);
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

  const polishLookup = useMemo(() => {
    const lookup = {};
    polishData.forEach(polish => {
      if (polish?._id) {
        lookup[polish._id] = polish;
      }
    });
    return lookup;
  }, [polishData]);

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

  const handleImagePress = (post) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      if (post?.photoUri) {
        setSelectedImage(post); // This will open our detailed modal view
      } else {
        Alert.alert("Image not available");
      }
    } else {
      // Single tap - just update the last tap time
      setLastTap(now);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchPolishes(); // Load polishes once
      await fetchBusinesses();
    };
    loadInitialData();

  }, [])

  const fetchPolishes = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/polishes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (isMounted.current) {
        setPolishData(response.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch polishes:', error);
    }
  }, []);

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

  const fetchBusinesses = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/businesses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBusinessData(response.data?.businesses || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

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

  //const deletePost = async (postId) => {
  //  setPostToDelete(postId);
  //  setIsDeleteModalVisible(true);
  //};
  const deletePost = async (postId) => {
    try {
      const token = await getToken();
      if (!token) {
        alert("Please login again");
        // Optionally navigate to login screen
        navigation.navigate("Login");
        return;
      }

      setPostToDelete(postId);
      setIsDeleteModalVisible(true);
    } catch (error) {
      console.error("Error preparing to delete post:", error);
      alert("Error preparing to delete post");
    }
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

  const handleBusinessNamePress = (businessId) => {
    const business = businessLookup[businessId];
    if (business) {
      navigation.navigate("BusinessScreen", {
        business: {
          ...business,
          _id: businessId
        }
      });
    } else {
      console.error("Business not found:", businessId);
    }
  };

  // Fetch followers count
  const fetchFollowersCount = useCallback(async (userId) => {
    try {
      setIsLoadingFollowers(true);
      const token = await getToken();
      const response = await axios.get(`${API_URL}/users/${userId}/followers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle different response structures
      const count = response.data?.count ||
        response.data?.data?.length ||
        0;
      setFollowersCount(count);
    } catch (error) {
      console.error("Error fetching followers count:", error);
      setFollowersCount(0);
    } finally {
      setIsLoadingFollowers(false);
    }
  }, []);

  // Update your businessLookup creation
  const businessLookup = businessData.reduce((acc, business) => {
    acc[business._id] = {
      name: business.businessName || business.name,
      location: business.businessLocation,
    };
    return acc;
  }, {});

  // Add these functions to your component
  const handleProfilePicUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],  // Square aspect ratio
        quality: 0.7,    // 70% quality to reduce file size
      });

      if (!result.canceled && result.assets[0].uri) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image');
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    try {
      const token = await getToken();

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to backend
      const response = await axios.put(
        `${API_URL}/account/profile-picture`,
        { image: `data:image/jpeg;base64,${base64Image}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state by reloading user data
      await loadUserData();
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to update profile picture');
    }
  };

  const takeProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        await uploadProfilePicture(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      alert('Error taking picture');
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
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header with settings button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 15 }}>
        <TouchableOpacity
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
      </View>

      {/* Profile section */}
      <View style={{ paddingHorizontal: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Profile picture circle - make it clickable */}
          <TouchableOpacity onPress={handleProfilePicUpload}>
            <View style={styles.profilePicContainer}>
              {user?.profilePic ? (
                <Image
                  source={{ uri: user.profilePic }}
                  style={styles.profilePic}
                />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Ionicons name="person" size={40} color="white" />
                </View>
              )}
              <View style={styles.editProfilePicIcon}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mergedPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate("Followers", { userId: user._id })}
              disabled={isLoadingFollowers || followersCount === 0}
            >
              {isLoadingFollowers ? (
                <ActivityIndicator size="small" color="#A020F0" />
              ) : (
                <>
                  <Text style={[
                    styles.statNumber,
                    followersCount > 0 ? styles.clickableCount : null
                  ]}>
                    {followersCount}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate("Following", {
                following: user.following,
                userId: user._id
              })}
              disabled={!user?.following?.length}
            >
              <Text style={[
                styles.statNumber,
                user?.following?.length ? styles.clickableCount : null
              ]}>
                {user?.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username and bio */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.bio}>{user?.bio || "No bio yet"}</Text>
          <Text style={styles.accountType}>
            {user?.isBusiness ? "Business Account" : "Personal Account"}
          </Text>
        </View>
      </View>

      {/* Posts grid */}
      {mergedPosts.length === 0 ? (
        <View style={styles.noPostsContainer}>
          <Ionicons name="camera-outline" size={50} color="#ddd" />
          <Text style={styles.noPostsText}>No Posts Yet</Text>
        </View>
      ) : (
        <FlatList
          data={mergedPosts}
          numColumns={3}
          keyExtractor={(item) => item._id} 
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleImagePress(item)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.photoUri }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              {item.photoUri ? null : (
                <Ionicons name="image-outline" size={40} color="#ddd" />
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          {/* Outer touchable for dismissing the modal */}
          <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
            <View style={styles.modalBackground} />
          </TouchableWithoutFeedback>

          {/* Modal content - not wrapped in TouchableWithoutFeedback */}
          <View style={styles.postModal}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Ionicons name="close" size={28} color="black" />
              </TouchableOpacity>
              <Text style={styles.modalUsername}>@{selectedImage?.username}</Text>
              <TouchableOpacity onPress={() => {
                setSelectedImage(null);
                deletePost(selectedImage._id);
              }}>
                <Ionicons name="trash-outline" size={24} color="red" />
              </TouchableOpacity>
            </View>

            {/* Post content */}
            <ScrollView>
              <Image
                source={{ uri: selectedImage?.photoUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />

              <View style={styles.modalContent}>
                <Text style={styles.modalCaption}>{selectedImage?.caption}</Text>

                <View style={styles.polishDetailsContainer}>
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: polishLookup[selectedImage?.polishId]?.hex || "#ccc" },
                    ]}
                  />
                  <TouchableOpacity onPress={() => {
                    handlePolishNamePress(selectedImage.polishId);
                    setSelectedImage(null);
                  }}>
                    <Text style={styles.postDetails}>
                      {polishLookup[selectedImage?.polishId]?.brand || ""}: {polishLookup[selectedImage?.polishId]?.name || "Unknown Polish"}
                    </Text>
                  </TouchableOpacity>
                  {/* Business details - fixed version */}
                  {selectedImage?.businessId && (
                    <>
                      <Text> | 📍 </Text>
                      <TouchableOpacity
                        onPress={() => {
                          handleBusinessNamePress(selectedImage.businessId);
                          setSelectedImage(null);
                        }}
                      >
                        <Text style={styles.postDetails}>
                          {businessLookup[selectedImage.businessId]?.name || "Unknown Business"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal transparent visible={isDeleteModalVisible} animationType="fade">
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Post?</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this post?</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteButton]}
                onPress={handleDeleteConfirmation}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  profilePicContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 20,
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  bio: {
    fontSize: 14,
    marginBottom: 5,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  noPostsText: {
    fontSize: 18,
    color: '#999',
    marginTop: 10,
  },
  gridItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
    backgroundColor: '#fafafa',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0', // Light background for loading state
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  postModal: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalUsername: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalImage: {
    width: '100%',
    height: 400,
    marginVertical: 10,
  },
  modalContent: {
    padding: 15,
  },
  modalCaption: {
    fontSize: 16,
    marginBottom: 15,
  },
  polishDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  postDetails: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  deleteModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    padding: 20,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  profilePicContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A020F0', // Purple color
  },
  editProfilePicIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 5,
  },
});

export default AccountScreen;