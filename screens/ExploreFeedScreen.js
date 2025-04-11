import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Button, Text, TouchableOpacity, Modal, TextInput, ScrollView,
  Image, Dimensions, SafeAreaView, StyleSheet, FlatList, LayoutAnimation,
  TouchableWithoutFeedback, Keyboard, Platform, KeyboardAvoidingView, ActivityIndicator
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import { API_URL } from "@env";
import { Colors } from '../src/colors';

const windowWidth = Dimensions.get('window').width;
const isiPad = windowWidth >= 768; 

export default function ExploreFeedScreen({ navigation }) {
  const [visibleComments, setVisibleComments] = useState({});
  const [polishData, setPolishData] = useState([]);
  const [businessData, setBusinessData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [polishModalVisible, setPolishModalVisible] = useState(false);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);
  const [lastTap, setLastTap] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPolishData, setFilteredPolishData] = useState([]);
  const [selectedPolish, setSelectedPolish] = useState(null);
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [filteredBusinessData, setFilteredBusinessData] = useState(businessData);
  const [isSelectedImageVisible, setIsSelectedImageVisible] = useState(false);
  const flatListRef = useRef(null);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [selectedLikes, setSelectedLikes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null); 




  // Change from polishId: null to:
const [postData, setPostData] = useState({
  caption: "",
  nailColor: "",
  businessId: "",
  polishArray: [],  
  photoUri: null,
});
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [showFollowingPosts, setShowFollowingPosts] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [polishPage, setPolishPage] = useState(1);
  const [hasMorePolishes, setHasMorePolishes] = useState(true);
  const [hasMoreBusinesses, setHasMoreBusinesses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [followingIds, setFollowingIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [listKey, setListKey] = useState(0);
  const itemsPerPage = 4;
  const [isFollowing, setIsFollowing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      // Reset states when screen comes into focus
      setPosts([]);
      setPage(1);
      setHasMorePosts(true);

      // Fetch fresh data
      fetchPosts(1);
      fetchPolishes(1);
      fetchBusinesses(1);
      fetchCurrentUserId();
      fetchFollowingIds();
    }, [])
  );
  const fetchFollowingIds = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.user?.following) {
        setFollowingIds(response.data.user.following);
        console.log("Following list: ", response.data.user.following);
      }
    } catch (error) {
      console.error("Error fetching following list:", error);
    }
  };


  const filterPosts = useCallback(() => {
    if (showFollowingPosts) {
      if (followingIds.length === 0) {
        return []; // Return empty array if not following anyone
      }
      return posts.filter(post =>
        followingIds.includes(post.userId.toString())
      );
    }
    return posts; // Return all posts when not filtering
  }, [showFollowingPosts, followingIds, posts]);

  const fetchPolishes = async (pageNum = 1, limit = 10) => {
    if (loading || !hasMorePolishes) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("Token is missing.");
        return;
      }

      console.log(`📡 Fetching polishes... Page: ${pageNum}`);
      const response = await axios.get(`${API_URL}/polishes`, {
        params: { page: pageNum, limit },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

      });

      if (response.data && Array.isArray(response.data.data)) {
        setPolishData((prev) => [...prev, ...response.data.data]);
        setFilteredPolishData((prev) => [...prev, ...response.data.data]);

        if (response.data.data.length < limit) {
          setHasMorePolishes(false); // No more pages to load
        }
      } else {
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching polishes:", error);
    } finally {
      setLoading(false);
    }

  };

  const polishLookup = polishData.reduce((acc, polish) => {
    acc[polish._id] = polish;
    return acc;
  }, {});

  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1); // Reset pagination
    applyFilters(text); // Filter the data
  };

  const handleAddPolishPress = () => {
    setModalVisible(false); // Close the first modal
    setPolishModalVisible(true); // Open the second modal
  };

  const handleAddBusinessPress = () => {
    setModalVisible(false);
    setBusinessModalVisible(true);
  };

  const handlePolishNamePress = (polishId) => {

    setIsSelectedImageVisible(false);
    const item = polishLookup[polishId];
    if (item) {
      navigation.navigate("PolishScreen", { item });
    } else {
      console.error("Polish not found:", polishId);
    }
  };


  const applyFilters = useCallback(
    (search = searchQuery) => {
      // If no color and no search, show full list
      if (!search) {
        setFilteredPolishData(polishData);
        return;
      }
      let filtered = polishData;

      if (search) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      setFilteredPolishData(filtered);
      flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    },
    [searchQuery, polishData]
  );

  const fetchBusinesses = async (pageNum = 1, limit = 10) => {
    if (loading || !hasMoreBusinesses) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("Token is missing.");
        return;
      }

      const response = await axios.get(`${API_URL}/businesses`, {
        params: { page: pageNum, limit },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data && Array.isArray(response.data.businesses)) {
        setBusinessData(prev => [...prev, ...response.data.businesses]);
        setFilteredBusinessData(prev => [...prev, ...response.data.businesses]);

        if (response.data.businesses.length < limit) {
          setHasMoreBusinesses(false);
        }
      } else {
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      // Optionally show error to user
    } finally {
      setLoading(false);
    }
  };

  const businessLookup = businessData.reduce((acc, business) => {
    acc[business._id] = {
      name: business.businessName || business.name,
      location: business.businessLocation,
    };
    return acc;
  }, {});

  const handleBusinessSearch = (text) => {
    setBusinessSearchQuery(text);
    setCurrentPage(1); // Reset pagination
    applyBusinessFilters(text); // Filter the data
  };

  const applyBusinessFilters = useCallback(
    (search = businessSearchQuery) => {
      if (!search) {
        setFilteredBusinessData(businessData);
        return;
      }

      const filtered = businessData.filter((business) => {
        // Search both businessName and name fields if they exist
        const nameMatch = business.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          business.name?.toLowerCase().includes(search.toLowerCase());

        // Optionally search other fields like location if needed
        const locationMatch = business.businessLocation?.toLowerCase().includes(search.toLowerCase());

        return nameMatch || locationMatch;
      });

      setFilteredBusinessData(filtered);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ animated: true, offset: 0 });
      }
    },
    [businessSearchQuery, businessData]
  );

  // Replace handleBusinessNamePress with:
  const handleBusinessNamePress = async (businessId) => {
    try {
      const token = await AsyncStorage.getItem("token");
  
      const response = await axios.get(`${API_URL}/business-user/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.data) {
        const item = response.data;
        navigation.navigate("OtherAccount", { item });
      } else {
        console.error("❌ Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching user from business ID:", error);
    }
  };
  

  const fetchPosts = async (pageNum = 1, limit = 10) => {
    if (loading || !hasMorePosts) return;

    setLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem("token");
      if (!storedToken) {
        alert("Please log in to continue.");
        return;
      }

      const response = await axios.get(`${API_URL}/posts`, {
        params: { page: pageNum, limit },
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.data && response.data.data) {
        // Always replace posts when pageNum is 1 (fresh load)
        if (pageNum === 1) {
          setPosts(response.data.data);
        } else {
          setPosts(prevPosts => [...prevPosts, ...response.data.data]);
        }

        if (response.data.data.length < limit) {
          setHasMorePosts(false);
        }

        setPage(pageNum + 1);
      } else {
        console.error("❌ Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching posts:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };


  const resizeImage = async (uri) => {
    const { width: screenWidth } = Dimensions.get("window");
    const resizeWidth = screenWidth * 0.8;
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: resizeWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulatedImage.uri;
  };

  const openCameraRoll = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access the camera roll is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      let selectedImage = result.assets[0].uri;
      const resizedUri = await resizeImage(selectedImage);
      setPostData((prevData) => ({ ...prevData, photoUri: resizedUri }));
    }
  };

  const openCamera = async (source) => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Camera access is required to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        let selectedImage = result.assets[0].uri;
        const resizedUri = await resizeImage(selectedImage);
        setPostData((prevData) => ({ ...prevData, photoUri: resizedUri }));
      }
    } else if (source === "cameraRoll") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access the camera roll is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        let selectedImage = result.assets[0].uri;
        const resizedUri = await resizeImage(selectedImage);
        setPostData((prevData) => ({ ...prevData, photoUri: resizedUri }));
      }
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const submitPost = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alert("Authentication token missing.");
        return;
      }


      let base64Image = null;
      if (postData.photoUri) {
        if (Platform.OS !== "web") {
          const base64Data = await FileSystem.readAsStringAsync(postData.photoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Image = `data:image/jpeg;base64,${base64Data}`;
        } else {
          const response = await fetch(postData.photoUri);
          const blob = await response.blob();
          base64Image = await blobToBase64(blob);
        }
      }


      const response = await axios.post(
        `${API_URL}/posts`,
        {
          caption: postData.caption,
          polishIds: postData.polishArray, // Changed field name
          businessId: postData.businessId,
          photoUri: base64Image || postData.photoUri,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        alert("Post created successfully!");
        setModalVisible(false);
        setSelectedPolish(null);
        setPostData({ 
          caption: "", 
          polishArray: [], 
          businessId: "", 
          photoUri: null 
        });
        setPosts(prevPosts => [response.data, ...prevPosts]);

      } else {
        throw new Error("Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error.response ? error.response.data : error.message);
      alert(error.response?.data?.error || "Error creating post");
    }
  };

  const handlePostCancel = () => {
    setModalVisible(false);
    setPostData({ 
      caption: "", 
      polishArray: [], // Reset to empty array
      businessId: "", 
      photoUri: null 
    });
  };


  const toggleComments = (postId) => {
    setVisibleComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const submitComment = async (postId, commentText) => {
    if (!commentText || commentText.trim() === "") return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/posts/${postId}/comments`,
        { text: commentText },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newComment = response.data;
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
              ...post,
              comments: [...(post.comments || []), newComment],
              newComment: "",
            }
            : post
        )
      );
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Comment failed to post.");
    }
  };
  const handleImagePress = (post) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      if (post?.photoUri) {
        setSelectedImage(post);
        setIsSelectedImageVisible(true);
      } else {
        alert("Image not available.");
      }
    } else {
      setLastTap(now);
    }
  };
  const toggleFollowingPosts = async () => {
    setIsFollowing(!isFollowing)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newShowFollowing = !showFollowingPosts;
    setShowFollowingPosts(newShowFollowing);
    
    if (newShowFollowing) {
      await fetchFollowingIds();
    }
    
    setListKey(prev => prev + 1);
  };
  

  const fetchCurrentUserId = async () => {
    const token = await AsyncStorage.getItem("token");
    const res = await axios.get(`${API_URL}/account`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data?.user) setCurrentUserId(res.data.user._id);
  };

  const toggleLike = async (postId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URL}/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // Use functional update to minimize re-renders
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId
            ? {
                ...post,
                likes: post.likes?.includes(currentUserId)
                  ? post.likes.filter(id => id !== currentUserId)
                  : [...(post.likes || []), currentUserId],
                _version: (post._version || 0) + 1 // Add version tracking
              }
            : post
        )
      );
    } catch (err) {
      console.error("Like failed:", err.response?.data || err.message);
    }
  };

  const showLikesModal = async (postId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/posts/${postId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedLikes(res.data.users || []);
      setLikesModalVisible(true);
    } catch (err) {
      console.error("Failed to load likes:", err.response?.data || err.message);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title and search button */}
      <View style={styles.topBar}>
  {/* Left: Explore / Following toggle */}
  <View style={styles.tabToggle}>
    <TouchableOpacity onPress={() => {
      setShowFollowingPosts(false);
      setIsFollowing(false);
    }}>
      <Text style={[styles.tabText, !showFollowingPosts && styles.tabTextActive]}>
        Explore
      </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => {
      setShowFollowingPosts(true);
      setIsFollowing(true);
      fetchFollowingIds();
    }}>
      <Text style={[styles.tabText, showFollowingPosts && styles.tabTextActive]}>
        Following
      </Text>
    </TouchableOpacity>
  </View>

  {/* Right: Add + Search */}
  <View style={styles.actionsRight}>
    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
      <Ionicons name="add-circle-outline" size={26} color={Colors.purple} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => navigation.navigate("SearchUser")} style={styles.iconButton}>
      <Ionicons name="search" size={24} color={Colors.purple} />
    </TouchableOpacity>
  </View>
</View>

  
      {/* Posts List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          key={`list-${listKey}`}
          data={filterPosts()}
          numColumns={isiPad ? 2 : 1} 
  columnWrapperStyle={isiPad ? styles.columnWrapper : null}
          refreshing={loading}
          onRefresh={() => {
            setPosts([]);
            setPage(1);
            setHasMorePosts(true);
            fetchPosts(1);
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            showFollowingPosts ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.grey} />
                <Text style={styles.emptyText}>
                  {followingIds.length === 0
                    ? "You're not following anyone yet!"
                    : "No posts from users you follow yet"}
                </Text>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (!showFollowingPosts && !loading && hasMorePosts) {
              fetchPosts(page);
            }
          }}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
  
              {/* Post Image */}
              <TouchableWithoutFeedback onPress={() => handleImagePress(item)}>
                {item.photoUri ? (
                  <Image 
                    source={{ uri: item.photoUri }} 
                    style={styles.postImage} 
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color={Colors.grey} />
                  </View>
                )}
              </TouchableWithoutFeedback>
  
              {/* Post Actions */}
<View style={styles.postActions}>
  {/* Like Button with Count */}
  <TouchableOpacity 
    onPress={() => toggleLike(item._id)} 
    style={styles.likeButton}
  >
    <Ionicons
      name={item.likes?.includes(currentUserId) ? "heart" : "heart-outline"}
      size={24}
      color={item.likes?.includes(currentUserId) ? "#FF3B30" : "#333"}
    />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => showLikesModal(item._id)}>
    <Text style={styles.actionCount}>
      {item.likes?.length || 0} {item.likes?.length === 1 ? "like" : "likes"}
    </Text>
    </TouchableOpacity>

  {/* Comment Button with Count */}
  <TouchableOpacity 
    onPress={() => toggleComments(item._id)} 
    style={[styles.commentButton, styles.commentButton]}
  >
    <Ionicons
      name="chatbubble-outline"
      size={22}
      color="#333"
    />
    <Text style={styles.actionCount}>
      {item.comments?.length || 0} {item.comments?.length === 1 ? "comment" : "comments"}
    </Text>
  </TouchableOpacity>
</View>
              
  
              {/* Caption */}
              {item.caption && (
                <Text style={styles.caption}>{item.caption}</Text>
              )}
  
{/* Polish & Business Details */}
{/* Polish & Business Details */}
<View style={styles.detailsContainer}> 
  <ScrollView 
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.polishScrollContainer}
  >
    {item.polishIds && item.polishIds.map(polishId => {
      const polish = polishLookup[polishId];
      return (
        <TouchableOpacity 
          key={polishId}
          onPress={() => handlePolishNamePress(polishId)}
          style={styles.detailItem}
        >
          <View
            style={[
              styles.colorCircle, 
              { 
                backgroundColor: polish?.hex || "#ccc",
                borderColor: polish?.hex ? 'rgba(0,0,0,0.2)' : '#999'
              }
            ]}
          />
          <Text style={styles.detailText} numberOfLines={1}>
            {polish?.brand || "Unknown"}: {polish?.name || "Polish"}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>

  {/* Business Name and Icon */}
  {item.businessId && (
    <TouchableOpacity 
      onPress={() => handleBusinessNamePress(item.businessId)}
      style={[styles.businessDetailItem, styles.businessDetail]}
    >
      <Ionicons 
        name="business-outline" 
        size={16}  // Match color circle size
        color="#333"
        style={styles.iconStyle}
      />
      <Text style={styles.detailText} numberOfLines={1}>
        {businessLookup[item.businessId]?.name || "Unknown Business"}
      </Text>
    </TouchableOpacity>
  )}
</View>
              {/* Comments Section */}
              {visibleComments[item._id] && (
                <View style={styles.commentsContainer}>
                  {/* Existing Comments */}
                  {item.comments && item.comments.length > 0 ? (
                    item.comments.map((comment, idx) => (
                      <View key={idx} style={styles.comment}>
                        <Text style={styles.commentUsername}>{comment.username}: </Text>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noComments}>No comments yet</Text>
                  )}
  
                  {/* New Comment Input */}
                  <View style={styles.commentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Write a comment..."
                      placeholderTextColor="#999"
                      value={item.newComment || ""}
                      onChangeText={(text) => {
                        setPosts((prevPosts) =>
                          prevPosts.map((post) =>
                            post._id === item._id ? { ...post, newComment: text } : post
                          )
                        );
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => submitComment(item._id, item.newComment)}
                      style={styles.commentSubmit}
                      disabled={!item.newComment}
                    >
                      <Text style={styles.commentSubmitText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        />
      </KeyboardAvoidingView>
  
      {/* Likes Modal */}
      <Modal
        visible={likesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLikesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Liked By</Text>
            <TouchableOpacity 
                  onPress={() => {
                    setLikesModalVisible(false); 
                  }}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            <FlatList
              data={selectedLikes}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.likerItem}>
                  <Text style={styles.likerName}>@{item.username}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noLikes}>No likes yet</Text>
              }
            />
          </View>
        </View>
      </Modal>
  
      {/* Create Post Modal */}
<Modal visible={modalVisible} transparent animationType="fade">
  <TouchableWithoutFeedback
    onPress={() => {
      if (Platform.OS !== "web") Keyboard.dismiss();
    }}
  >
    <View style={styles.postModalOverlay}>
      <View style={styles.postModalContainer}>
        <View style={styles.postModalHeader}>
          <Text style={styles.modalTitle}>Create Post</Text>
          <TouchableOpacity 
                  onPress={handlePostCancel}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color={Colors.purple} />
                </TouchableOpacity>
        </View>

        {/* Image Selection and Preview */}
        <View style={styles.mediaSection}>
          {postData.photoUri ? (
            <Image source={{ uri: postData.photoUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="images" size={48} color="#ddd" />
              <Text style={styles.placeholderText}>Add a photo</Text>
            </View>
          )}
          
          <View style={styles.imageButtonContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={() => openCamera("camera")}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={() => openCamera("cameraRoll")}>
              <Ionicons name="image-outline" size={20} color="#fff" />
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption Input */}
        <TextInput
          style={styles.input}
          placeholder="Add Caption"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          value={postData.caption}
          onChangeText={(text) => setPostData((prev) => ({ ...prev, caption: text }))}
        />

        {/* Business Selection */}
        <TouchableOpacity
          style={styles.tagButton}
          onPress={handleAddBusinessPress}
        >
          <Ionicons name="business-outline" size={18} color="#555" />
          <Text style={styles.tagButtonText}>
            {postData.businessName || "Tag a business"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>

        {/* Nail Polish Selection */}
<TouchableOpacity
  style={styles.tagButton}
  onPress={handleAddPolishPress}
>
  <Ionicons name="color-palette-outline" size={18} color="#555" />
  <Text style={styles.tagButtonText}>
    {postData.polishArray.length > 0
      ? `${postData.polishArray.length} polishes selected`
      : "Add nail polishes"}
  </Text>
  <Ionicons name="chevron-forward" size={16} color="#999" />
</TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity 
          onPress={submitPost} 
          style={[
            styles.submitButton,
            { 
              opacity: postData.photoUri && postData.polishArray.length > 0 ? 1 : 0.5
            }
          ]}
          disabled={!postData.photoUri || postData.polishArray.length === 0}
        >
          <Text style={styles.submitButtonText}>Share Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>
  
      {/* Polish Picker Modal */}
      <Modal
        transparent={true}
        visible={polishModalVisible}
        onRequestClose={() => setPolishModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Polish</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setPolishModalVisible(false);
                    setModalVisible(true);
                  }}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
  
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search polishes..."
                  placeholderTextColor="#999"
                  onChangeText={handleSearch}
                  value={searchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : null}
              </View>
  
              {/* Polish List */}
              <FlatList
                ref={flatListRef}
                contentContainerStyle={{ flexGrow: 1 }}
  ListFooterComponent={
    <>
      {loading && <ActivityIndicator size="small" color="#E0E0E0"/>}
      {/* Add spacing before Done button */}
      <View style={{ height: 16 }} />
    </>
  }
                data={filteredPolishData.slice(0, currentPage * itemsPerPage)}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                  style={[
                    styles.polishItem,
                    postData.polishArray.includes(item._id) && styles.selectedPolishItem
                  ]}
                  onPress={() => {
                    setPostData((prev) => {
                      const newArray = prev.polishArray.includes(item._id)
                        ? prev.polishArray.filter(id => id !== item._id)
                        : [...prev.polishArray, item._id];
                      return { ...prev, polishArray: newArray };
                    });
                  }}
                  >
                    {postData.polishArray.includes(item._id) && (
      <Ionicons 
        name="checkmark-circle" 
        size={24} 
        color={Colors.purple}
        style={styles.checkIcon}
      />
    )}
                    {item.picture ? (
                      <Image 
                        source={{ uri: item.picture }} 
                        style={styles.polishImage} 
                      />
                    ) : (
                      <View style={styles.polishImagePlaceholder}>
                        <Ionicons name="color-palette-outline" size={24} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.polishInfo}>
                      <Text style={styles.polishName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.polishBrand} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                onEndReached={() => {
                  if (!loading && filteredPolishData.length > currentPage * itemsPerPage) {
                    setCurrentPage((prev) => prev + 1);
                  }
                }}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  <View style={styles.emptyResults}>
                    <Ionicons name="color-palette-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyResultsText}>
                      {searchQuery ? "No matching polishes" : "No polishes available"}
                    </Text>
                  </View>
                }
              />
              <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => {
            setPolishModalVisible(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.doneButtonText}>Done Selecting</Text>
        </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
  
      {/* Business Picker Modal */}
      <Modal
        transparent={true}
        visible={businessModalVisible}
        animationType="slide"
        onRequestClose={() => setBusinessModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Business</Text>
                <TouchableOpacity 
                  onPress={() => setBusinessModalVisible(false)}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
  
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search businesses..."
                  placeholderTextColor="#999"
                  onChangeText={handleBusinessSearch}
                  value={businessSearchQuery}
                />
                {businessSearchQuery ? (
                  <TouchableOpacity onPress={() => setBusinessSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : null}
              </View>
  
              {/* Business List */}
              <FlatList
                data={filteredBusinessData}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.businessItem}
                    onPress={() => {
                      setPostData(prev => ({
                        ...prev,
                        businessId: item._id,
                        businessName: item.businessName || item.name
                      }));
                      setBusinessModalVisible(false);
                      setModalVisible(true);
                    }}
                  >
                    <View style={styles.businessIcon}>
                      <Ionicons name="business-outline" size={24} color={Colors.purple} />
                    </View>
                    <View style={styles.businessInfo}>
                      <Text style={styles.businessName} numberOfLines={1}>
                        {item.businessName || item.name}
                      </Text>
                      {item.businessLocation && (
                        <Text style={styles.businessLocation} numberOfLines={1}>
                          {item.businessLocation}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyResults}>
                    <Ionicons name="business-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyResultsText}>
                      {businessSearchQuery ? "No matching businesses" : "No businesses available"}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
  
      {/* Image Zoom Modal */}
      {selectedImage && selectedImage.photoUri && (
  <Modal
    visible={isSelectedImageVisible}
    transparent
    animationType="fade"
    onRequestClose={() => setSelectedImage(null)}
  >
    <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
      <View style={styles.imageModalOverlay}>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            onPress={() => setSelectedImage(null)}
            style={styles.imageModalClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: selectedImage.photoUri }}
            style={styles.imageModalImage}
            resizeMode="contain"
          />
          
          <View style={styles.imageModalFooter}>
            <Text style={styles.imageModalCaption}>{selectedImage.caption}</Text>
            <View style={styles.imageModalDetails}>
              <TouchableOpacity onPress={() => handlePolishNamePress(selectedImage.polishId)}>
                <Text style={styles.imageModalPolishText}>
                  {polishLookup[selectedImage.polishId]?.brand || ""}:{" "}
                  {polishLookup[selectedImage.polishId]?.name || "Unknown Polish"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.imageModalLocation}>📍 {selectedImage.nailLocation}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
      )}
    </SafeAreaView>
  );
};
  const styles = StyleSheet.create({
    // Container Styles
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      position: 'relative',
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: '#333',
    },
   
  
    // Filter Styles
    filterContainer: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#f5f5f5',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      marginRight: 'auto', 
      paddingHorizontal: 12,
    },
    filterButtonActive: {
      backgroundColor: '#f0e8ff',
      borderColor: Colors.purple,
    },
    filterText: {
      color: '#999',
      fontSize: 14,
      marginLeft: 8,
      fontWeight: '500',
    },
    filterTextActive: {
      color: Colors.purple,
      fontWeight: '600',
    },
    listContent: {
      paddingBottom: 80,
      paddingHorizontal: isiPad ? 8 : 0, 
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyText: {
      marginTop: 16,
      color: '#999',
      textAlign: 'center',
      fontSize: 16,
    },
  
    postContainer: {
      backgroundColor: 'white',
      borderRadius: 12,
      marginHorizontal: isiPad ? 8 : 16,
      marginBottom: 16,
      padding: isiPad ? 16 : 16, // Reduced padding on iPad
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
      width: isiPad ? '48%' : 'auto', // Changed from 95% to 48%
      maxWidth: isiPad ? 400 : '100%',
    },
    postHeader: {
      marginBottom: 12,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      paddingHorizontal: isiPad ? 12 : 0, 
    },
    username: {
      fontWeight: '600',
      color: "#333",
    },
    postImage: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 8,
      backgroundColor: '#f5f5f5',
    },
    imagePlaceholder: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 8,
      backgroundColor: '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    postActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 20,
    },
    commentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    actionCount: {
      marginLeft: 6,
      fontSize: 14,
      color: '#333',
    },
    likeCount: {
      fontSize: 14,
      color: '#333',
      marginRight: 7,
    },
    caption: {
      marginTop: 8,
      fontSize: 15,
      color: '#333',
    },
    // Details Styles
    detailsContainer: {
      marginTop: 12,  // Add some space from the caption
    },
    polishScrollContainer: {
      paddingVertical: 4,
      paddingRight: 16, // Extra padding on the right
    }, 
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginRight: 8, // Space between items
      height: 32, // Fixed height for consistency
    },
    businessDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginRight: 8,
      height: 32,
      alignSelf: 'flex-start', // 🛠️ prevents full-width stretching
    },
    
    colorCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 6,
      borderWidth: 1,
    },
    detailText: {
      fontSize: 12,
      color: '#333',
      maxWidth: 120, // Limit text width
    },
    // Comments Styles
    commentsContainer: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 12,
    },
    comment: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    commentUsername: {
      fontWeight: '600',
      color: '#333',
    },
    commentText: {
      color: '#333',
      flex: 1,
    },
    noComments: {
      color: '#999',
      fontStyle: 'italic',
      marginBottom: 12,
    },
    commentInputContainer: {
      flexDirection: 'row',
      marginTop: 8,
    },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#eee',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#f9f9f9',
    },
    commentSubmit: {
      marginLeft: 8,
      backgroundColor: Colors.purple,
      borderRadius: 20,
      paddingHorizontal: 16,
      justifyContent: 'center',
      opacity: 0.7,
    },
    commentSubmitActive: {
      opacity: 1,
    },
    commentSubmitText: {
      color: 'white',
      fontWeight: '500',
    },
  
    
  
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: 'white',
      borderRadius: 16,
      width: '80%',
      maxHeight: '60%',
    },
    pickerModalContainer: {
      backgroundColor: 'white',
      borderRadius: 16,
      width: '90%',
      maxHeight: '80%',
      justifyContent: 'space-between', // Add this
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
    },
    modalClose: {
      padding: 4,
    },
    likerItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f5f5f5',
    },
    likerName: {
      fontSize: 16,
      color: '#333',
      textAlign: 'center',
    },
    noLikes: {
      textAlign: 'center',
      color: '#999',
      padding: 20,
    },
  
    // Create Post Modal Styles
    postModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    postModalContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    postModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    mediaSection: {
      marginBottom: 16,
    },
    placeholderText: {
      color: '#999',
      marginTop: 8,
    },
    imagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 12,
      resizeMode: 'cover',
    },
    imageButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: '8',
      gap: 12,
    },
    imageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.purple,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      gap: 6,
    },
    imageButtonText: {
      color: '#fff',
      fontSize: 14,
    },
    input: {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    tagButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8,
      marginBottom: 12,
      gap: 8,
    },
    tagButtonText: {
      flex: 1,
      color: '#333',
      fontSize: 14,
    },
    submitButton: {
      backgroundColor: Colors.purple,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },  
    submitButton: {
      backgroundColor: Colors.purple,
      margin: 16,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    submitButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
  
    // Picker Modal Styles
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 10,
      paddingHorizontal: 12,
      margin: 16,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      height: 40,
      paddingHorizontal: 8,
      color: '#333',
    },
    polishItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    polishImage: {
      width: 50,
      height: 50,
      borderRadius: 6,
      backgroundColor: '#f5f5f5',
    },
    polishImagePlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 6,
      backgroundColor: '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    polishInfo: {
      flex: 1,
      marginLeft: 12,
    },
    polishName: {
      fontSize: 16,
      color: '#333',
    },
    polishBrand: {
      fontSize: 14,
      color: '#666',
    },
    businessItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    businessIcon: {
      marginRight: 12,
    },
    businessInfo: {
      flex: 1,
    },
    businessName: {
      fontSize: 16,
      color: '#333',
    },
    businessLocation: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    emptyResults: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyResultsText: {
      marginTop: 16,
      color: '#999',
      textAlign: 'center',
    },
  
    // Image Viewer Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    padding: 5,
  },
  imageModalImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
  },
  imageModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  imageModalCaption: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  imageModalDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  imageModalPolishText: {
    color: Colors.purple,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  imageModalLocation: {
    fontSize: 14,
    color: '#666',
  },
  selectedPolishItem: {
    backgroundColor: '#f0f0ff',
  },
  checkIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
  },
  doneButton: {
    backgroundColor: Colors.purple,
    padding: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    width: '100%', // Add this
    zIndex: 10, // Ensure it stays above other content
  },
  
  tabToggle: {
    flexDirection: "row",
    gap: 16,
  },
  
  tabText: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  
  tabTextActive: {
    color: Colors.purple,
    borderBottomWidth: 2,
    borderBottomColor: Colors.purple,
  },
  
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  
  iconButton: {
    padding: 4,
  },
  businessDetail: {
    marginTop: 4,  // Add slight separation from polish items
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // This adds space between items (works in React Native 0.71+)
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconStyle: {
    marginRight: 8, // Adds 8px space between icon and text
  },
  
  });