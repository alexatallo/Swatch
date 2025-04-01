import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Button, Text, TouchableOpacity, Modal, TextInput,
  Image, Dimensions, SafeAreaView, StyleSheet, FlatList,
  TouchableWithoutFeedback, Keyboard, Platform, ActivityIndicator
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import { API_URL } from "@env";

export default function ExploreFeedScreen({navigation}) {
  const [visibleComments, setVisibleComments] = useState({});
  const [polishData, setPolishData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [polishModalVisible, setPolishModalVisible] = useState(false);
  const [lastTap, setLastTap] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPolishData, setFilteredPolishData] = useState([]);
  const [selectedPolish, setSelectedPolish] = useState(null);
  const [isSelectedImageVisible, setIsSelectedImageVisible] = useState(false);
  const flatListRef = useRef(null);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [selectedLikes, setSelectedLikes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [postData, setPostData] = useState({
    caption: "",
    nailColor: "",
    nailLocation: "",
    polishId: null,  // Store the polishId
    polishName: "",  // Store polish name
    photoUri: null,
  });
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [polishPage, setPolishPage] = useState(1);
  const [hasMorePolishes, setHasMorePolishes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  useEffect(() => {
    fetchPosts();
    fetchPolishes();
    fetchCurrentUserId();
  }, [navigation]);
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
        if (pageNum === 1) {
          setPosts(response.data.data);  
        } else {
          setPosts(prevPosts => {
            const newPosts = response.data.data.filter(
              post => !prevPosts.some(p => p._id === post._id)
            );
            return [...prevPosts, ...newPosts];
          });
        }

        if (response.data.data.length < limit) {
          setHasMorePosts(false);
        }


        setPage(pageNum + 1);
      } else {
        console.error("Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error.response ? error.response.data : error.message);
    }
    setLoading(false);
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
                polishId: postData.polishId,
                nailLocation: postData.nailLocation,
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
            setPostData({ caption: "", polishId: null, nailLocation: "", photoUri: null });
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
    setSelectedPolish(null)
    setPostData({ caption: "", polishId: null, nailLocation: "", photoUri: null });
  };
// COMMENTS 
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
  
      // Optimistic update
      setPosts(prev =>
        prev.map(post =>
          post._id === postId
            ? {
                ...post,
                likes: post.likes?.includes(currentUserId)
                  ? post.likes.filter(id => id !== currentUserId)
                  : [...(post.likes || []), currentUserId],
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
      {/* Search Button in the Top-Right Corner */}
      <TouchableOpacity 
        onPress={() => navigation.navigate("SearchUser")}
        style={styles.searchButton}
      >
        <Ionicons name="search-outline" size={30} color="purple" />
      </TouchableOpacity>
  
      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={50} color="#6A5ACD" />
      </TouchableOpacity>
  
      <Text style={styles.title}>Explore Feed</Text>
  
      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={{ position: "relative", alignItems: "center" }}>
            {/* Post Card */}
            <View style={styles.postCard}>
              {/* Username */}
              <Text style={styles.username}>@{item.username}</Text>
  
              {/* Post Image */}
              <TouchableWithoutFeedback onPress={() => handleImagePress(item)}>
                {item.photoUri ? (
                  <Image source={{ uri: item.photoUri }} style={styles.postImage} />
                ) : (
                  <Text>No Image Available</Text>
                )}
              </TouchableWithoutFeedback>
  
              {/* Caption */}
              <Text style={styles.postCaption}>{item.caption}</Text>
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
  <TouchableOpacity onPress={() => toggleLike(item._id)}>
    <Ionicons
      name={item.likes?.includes(currentUserId) ? "heart" : "heart-outline"}
      size={24}
      color={item.likes?.includes(currentUserId) ? "red" : "gray"}
      style={{ marginRight: 8 }}
    />
  </TouchableOpacity>

  <TouchableOpacity onPress={() => showLikesModal(item._id)}>
    <Text style={{ color: "#333" }}>
      {item.likes?.length || 0} {item.likes?.length === 1 ? "Like" : "Likes"}
    </Text>
  </TouchableOpacity>
</View>

              {/* Nail Polish Details */}
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
  
              {/* Comment Toggle Button */}
              <TouchableOpacity onPress={() => toggleComments(item._id)} style={{ marginTop: 10 }}>
                <Text style={{ color: "#6A5ACD", fontWeight: "bold" }}>
                   {visibleComments[item._id] ? "Hide Comments" : "Show Comments"}
                </Text>
              </TouchableOpacity>
  
              {/* Comments Section */}
              {visibleComments[item._id] && (
                <View style={{ marginTop: 10 }}>
                  {/* Display Comments */}
                  {item.comments && item.comments.length > 0 ? (
                    item.comments.map((comment, idx) => (
                      <Text key={idx} style={{ marginBottom: 4 }}>
                        <Text style={{ fontWeight: "bold" }}>{comment.username}: </Text>
                        {comment.text}
                      </Text>
                    ))
                  ) : (
                    <Text style={{ color: "#999" }}>No comments yet.</Text>
                  )}
  
                  {/* New Comment Input */}
                  <View style={{ flexDirection: "row", marginTop: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: "#ccc",
                        borderRadius: 10,
                        padding: 8,
                        backgroundColor: "#f0f0f0",
                      }}
                      placeholder="Write a comment..."
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
                      style={{
                        marginLeft: 8,
                        backgroundColor: "#6A5ACD",
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "bold" }}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      />
      <Modal
  visible={likesModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setLikesModalVisible(false)}
>
  <View style={styles.modalBackground}>
    <View style={[styles.modalContainer, { maxHeight: 400 }]}>
      <Text style={styles.modalTitle}>Liked By</Text>
      {selectedLikes.length === 0 ? (
        <Text>No likes yet</Text>
      ) : (
        selectedLikes.map((user, idx) => (
          <Text key={idx} style={styles.likerName}>@{user.username}</Text>
        ))
      )}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setLikesModalVisible(false)}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

{/* Create Post Modal */}
<Modal visible={modalVisible} transparent animationType="none">
<TouchableWithoutFeedback
  onPress={() => {
    if (Platform.OS !== "web") Keyboard.dismiss();
  }}
>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Create a Post</Text>

        {/* Image Selection Buttons */}
        <View style={styles.imageButtonContainer}>
          <TouchableOpacity style={styles.imageButton} onPress={() => openCamera("camera")}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.imageButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={() => openCamera("cameraRoll")}>
            <Ionicons name="image-outline" size={24} color="#fff" />
            <Text style={styles.imageButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {postData.photoUri && (
          <Image source={{ uri: postData.photoUri }} style={styles.imagePreview} />
        )}

        {/* Caption Input */}
        <TextInput
          style={styles.input}
          placeholder="Enter caption..."
          placeholderTextColor="#aaa"
          value={postData.caption}
          onChangeText={(text) => setPostData((prev) => ({ ...prev, caption: text }))}
        />

        {/* Nail Location Input */}
        <TextInput
          style={styles.input}
          placeholder="Enter nail location..."
          placeholderTextColor="#aaa"
          value={postData.nailLocation}
          onChangeText={(text) => setPostData((prev) => ({ ...prev, nailLocation: text }))}
        />

        {/* Add Nail Polish Button */}
        <TouchableOpacity
          style={styles.addPolishButton}
          onPress={handleAddPolishPress}
        >
          <Text style={styles.addPolishText}>
            {postData.polishName ? `Selected: ${postData.polishName}` : "Add Nail Polish"}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handlePostCancel} style={styles.cancelButton}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={submitPost} style={styles.submitButton}>
            <Text style={styles.buttonText}>Post</Text>
          </TouchableOpacity>
        </View>
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
      <View style={styles.polishModalContainer}>
        <Text style={styles.modalTitle}>Select a Nail Polish</Text>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search nail polish..."
          placeholderTextColor="#888"
          onChangeText={handleSearch}
          value={searchQuery}
        />

        {/* List of Nail Polishes */}
        <View style={styles.polishListContainer}>
          <FlatList
            ref={flatListRef}
            data={filteredPolishData.slice(0, currentPage * itemsPerPage)}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.polishItem}
                onPress={() => {
                  setPostData((prev) => ({
                    ...prev,
                    polishId: item._id,
                    polishName: item.name,
                  }));
                  setPolishModalVisible(false);
                  setModalVisible(true);
                }}
              >
                <Image source={{ uri: item.picture }} style={styles.polishImage} />
                <Text style={styles.polishName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            onEndReached={() => {
              if (!loading && filteredPolishData.length > currentPage * itemsPerPage) {
                setCurrentPage((prev) => prev + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading && <ActivityIndicator size="small" color="purple" />}
          />
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            setPolishModalVisible(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
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
      <View style={styles.modalImageContainer}>
        <View style={styles.modalImageContent}>
          <Image
            source={{ uri: selectedImage.photoUri }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <Text style={styles.fullScreenCaption}>{selectedImage.caption}</Text>
          <Text style={styles.fullScreenDetails}>
            <TouchableOpacity onPress={() => handlePolishNamePress(selectedImage.polishId)}>
              <Text style={styles.clickableText}>
                {polishLookup[selectedImage.polishId]?.brand || ""}:{" "}
                {polishLookup[selectedImage.polishId]?.name || "Unknown Polish"}
              </Text>
            </TouchableOpacity>
            <Text> | 📍 {selectedImage.nailLocation}</Text>
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
)}
    </SafeAreaView>
  );
  

};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center",
  },
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
    fontSize: 18, // Larger font size
    fontWeight: "bold",
    marginBottom: 10,
  },
  polishDetailsContainer: {
    flexDirection: "row", // Align color circle and text horizontally
    alignItems: "center", // Center items vertically
    marginTop: 10,
  },
  colorCircle: {
    width: 20, // Size of the circle
    height: 20,
    borderRadius: 10, // Make it circular
    marginRight: 10, // Space between circle and text
  },
  postDetails: {
    fontSize: 16, // Larger font size
    color: "#666",
    flex: 1, 
  },
  likerName: {
    fontSize: 16,
    paddingVertical: 6,
    textAlign: "center",
    color: "#555",
  },  
  
  imageButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: "#6A5ACD",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginVertical: 10,
    resizeMode: "cover",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  addPolishButton: {
    backgroundColor: "#6A5ACD",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addPolishText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginRight: 5,
  },
  submitButton: {
    backgroundColor: "#6A5ACD",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginLeft: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  polishModalContainer: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%", // Fixed modal height
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "space-between", // Ensures the Close button sticks to the bottom
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
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    polishModalContainer: {
      width: "90%",
      maxWidth: 400,
      height: 580, // Fixed modal height
      backgroundColor: "#fff",
      padding: 20,
      borderRadius: 15,
      justifyContent: "center", // Center content vertically
      alignItems: "center", // Center content horizontally
    },
    modalContainer: {
      width: "90%",
      maxWidth: 400,
      maxHeight: "80%", // Fixed modal height
      backgroundColor: "#fff",
      padding: 20,
      borderRadius: 15,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: 'center',
    },
    searchInput: {
      height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    },
    polishListContainer: {
      flex: 1, // Take up remaining space
    marginBottom: 10, 
    },
    polishItem: {
      flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    },
    polishImage: {
      width: 60,
      height: 60,
      borderRadius: 10,
      marginRight: 10,
    },
    polishName: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#333",
    },
    closeButton: {
      backgroundColor: "#6A5ACD",
      padding: 10,
      borderRadius: 15,
      alignItems: "center",
    },
    closeButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
    },
    modalImageContainer: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalImageContent: {
      backgroundColor: "#fff",
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      width: "90%",
    },
    fullScreenImage: {
      width: "100%",
      height: 300,
      borderRadius: 10,
    },
    fullScreenCaption: {
      fontSize: 18,
      fontWeight: "bold",
      marginTop: 10,
      textAlign: "center",
    },
    fullScreenDetails: {
      fontSize: 16,
      color: "#666",
      marginTop: 5,
      textAlign: "center",
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'center', // Centers vertically
      alignItems: 'center', // Centers horizontally
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    searchButton: {
      position: "absolute",
      top: 50, // Adjust for notch/safe area
      right: 20, // Distance from right
      zIndex: 10, // Make sure it's on top of other elements
    },
});

