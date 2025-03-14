import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  Image, Dimensions, SafeAreaView, StyleSheet, FlatList,
  ActivityIndicator, KeyboardAvoidingView, ScrollView,
  TouchableWithoutFeedback, Keyboard, Platform
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import { API_URL } from "@env";




export default function ExploreFeedScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [postData, setPostData] = useState({
    caption: "",
    nailColor: "",
    nailLocation: "",
    photoUri: null,
  });
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);


  const { width } = Dimensions.get("window");


  useEffect(() => {
    fetchPosts();
  }, []);




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
        console.error("❌ Unexpected API response:", response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching posts:", error.response ? error.response.data : error.message);
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
                nailColor: postData.nailColor,
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

            setPosts(prevPosts => [response.data, ...prevPosts]);

            setPostData({ caption: "", nailColor: "", nailLocation: "", photoUri: null });
        } else {
            throw new Error("Failed to create post");
        }
    } catch (error) {
        console.error("Error creating post:", error.response ? error.response.data : error.message);
        alert(error.response?.data?.error || "Error creating post");
    }
};






  const deletePost = async (postId) => {
    setPostToDelete(postId);
    setIsDeleteModalVisible(true);  // Show delete confirmation modal
  };


  const handleDeleteConfirmation = async () => {
    if (!postToDelete) return;


    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alert("Authentication token missing.");
        return;
      }


      const response = await axios.delete(`${API_URL}/posts/${postToDelete}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });


      if (response.data) {
        alert("Post deleted successfully!");
        setPosts(prevPosts => prevPosts.filter(post => post._id !== postToDelete));
      } else {
        throw new Error("Failed to delete post");
      }
    } catch (error) {
      alert("Error deleting post: " + (error.response?.data?.error || error.message));
    }


    setIsDeleteModalVisible(false);
    setPostToDelete(null);
  };


  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
    setPostToDelete(null);
  };


  const handleImagePress = (post) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;  
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      if (post?.photoUri) {
        setSelectedImage(post);
      } else {
        alert("Image not available.");
      }
    } else {
      setLastTap(now);
    }
  };







  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={50} color="#6A5ACD" />
      </TouchableOpacity>


      <Text style={styles.title}>Explore Feed</Text>

      <FlatList
    data={posts}
    keyExtractor={(item) => item._id || Math.random().toString()}
    renderItem={({ item }) => (
        <View style={{ position: "relative", alignItems: "center" }}>
            {/* Post Card */}
            <View style={styles.postCard}>
                {/* Username */}
                <Text style={styles.username}>@{item.username}</Text>

                <TouchableWithoutFeedback onPress={() => handleImagePress(item)}>
                    {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={styles.postImage} />
                    ) : (
                        <Text>No Image Available</Text>
                    )}
                </TouchableWithoutFeedback>

                <Text style={styles.postCaption}>{item.caption}</Text>
                <Text style={styles.postDetails}>💅 {item.nailColor} | 📍 {item.nailLocation}</Text>
            </View>

            {/* Trash Icon */}
            <TouchableOpacity
                style={styles.trashButton}
                onPress={() => deletePost(item._id)}
            >
                <Ionicons name="trash-outline" size={24} color="purple" />
            </TouchableOpacity>
        </View>
    )}
/>


{/* Create Post Modal */}
<Modal visible={modalVisible} transparent animationType="fade">
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

        {["caption", "nailColor", "nailLocation"].map((field) => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={`Enter ${field}...`}
            placeholderTextColor="#aaa"
            value={postData[field]}
            onChangeText={(text) => setPostData((prev) => ({ ...prev, [field]: text }))}
          />
        ))}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
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



      {/* Delete Confirmation Modal */}
      {isDeleteModalVisible && (
        <Modal transparent visible={isDeleteModalVisible} animationType="slide">
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Are you sure you want to delete this post?</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={handleDeleteCancel} style={styles.cancelButton}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteConfirmation} style={styles.submitButton}>
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {selectedImage && selectedImage.photoUri && (
        <Modal
          visible={true}
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
                  💅 {selectedImage.nailColor} | 📍 {selectedImage.nailLocation}
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
    borderRadius: 10,
    marginVertical: 10,
    width: "90%",
    alignSelf: "center",
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  postCaption: {
    fontSize: 16,
    fontWeight: "bold",
  },
  postDetails: {
    fontSize: 14,
    color: "#666",
  },
  deleteButton: {
    backgroundColor: "#FF6347",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: Dimensions.get("window").width * 0.9,
    maxWidth: 500,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    alignItems: "center",
  },
  imageButton: {
    backgroundColor: "#6A5ACD",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imagePreview: {
    width: 200,
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginRight: 5,
  },
  submitButton: {
    backgroundColor: "#6A5ACD",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginLeft: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalImageContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
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
  closeButton: {
    backgroundColor: "#6A5ACD",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  trashButton: {
    position: "absolute",
    bottom: 20,
    right: 35,
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
  imageButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: "#6A5ACD",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    alignItems: "center",
  },
  
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
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
});