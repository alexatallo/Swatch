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

const API_URL = "http://35.50.90.208:5000";

export default function ExploreFeedScreen() {
  const [modalVisible, setModalVisible] = useState(false);
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
    if (loading || !hasMorePosts) return; // Prevent multiple calls or fetching when no more posts are available

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
          setPosts(response.data.data); // Replace posts if it's first load
        } else {
          setPosts(prevPosts => {
            const newPosts = response.data.data.filter(
              post => !prevPosts.some(p => p._id === post._id)
            );
            return [...prevPosts, ...newPosts];
          });
        }

        // Stop fetching if fewer posts than limit are returned
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
    const resizeWidth = screenWidth * 0.8; // Resize to 80% of the screen width
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: resizeWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulatedImage.uri;
  };

  const openCamera = async () => {
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
      setPostData(prevData => ({ ...prevData, photoUri: resizedUri }));
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
          ...postData,
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
        
        // Prepend new post to the list
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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle" size={50} color="#6A5ACD" />
      </TouchableOpacity>

      <Text style={styles.title}>Explore Feed</Text>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.postImage} />
            ) : (
              <Text>No Image Available</Text>
            )}
            <Text style={styles.postCaption}>{item.caption}</Text>
            <Text style={styles.postDetails}>💅 {item.nailColor} | 📍 {item.nailLocation}</Text>
          </View>
        )}
        onEndReached={() => fetchPosts(page)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#6A5ACD" /> : null}
      />

<Modal visible={modalVisible} transparent animationType="slide">
  <View style={styles.modalBackground}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.modalTitle}>Create a Post</Text>
        <TouchableOpacity style={styles.imageButton} onPress={openCamera}>
          <Text style={styles.imageButtonText}>+ Add Image</Text>
        </TouchableOpacity>
        {postData.photoUri && <Image source={{ uri: postData.photoUri }} style={styles.imagePreview} />}
        {['caption', 'nailColor', 'nailLocation'].map(field => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={`Enter ${field}...`}
            placeholderTextColor="#aaa"
            value={postData[field]}
            onChangeText={(text) => setPostData(prev => ({ ...prev, [field]: text }))}
          />
        ))}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={submitPost} style={styles.submitButton}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
</Modal>
    </SafeAreaView>
  );
}

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
    height: 200,
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
});