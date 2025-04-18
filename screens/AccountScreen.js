import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
 View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity,
 RefreshControl, Modal, StyleSheet, Alert, ScrollView, TouchableWithoutFeedback
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
 const [isPostModalVisible, setIsPostModalVisible] = useState(false);
 const [postToDelete, setPostToDelete] = useState(null);
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const isMounted = useRef(true);
 const [selectedImage, setSelectedImage] = useState(null);
 const [isSelectedImageVisible, setIsSelectedImageVisible] = useState(false);
 const [lastTap, setLastTap] = useState(null);
 const [followersCount, setFollowersCount] = useState(0);
 const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
 const [collectionData, setCollectionData] = useState([]); // State for collections
 const [isCollectionModalVisible, setCollectionModalVisible] = useState(false); // State for modal visibility
 const [currentUserId, setCurrentUserId] = useState(null); 
 const loadUserData = async () => {
   try {
     const token = await getToken();
     if (!token) {
       console.error("Token is missing.");
       setLoading(false);
       return;
     }


     // fetch user data, posts, and collections 
     const [userResponse, postsResponse, collectionsResponse] = await Promise.all([
       axios.get(`${API_URL}/account`, {
         headers: { Authorization: `Bearer ${token}` },
       }),
       axios.get(`${API_URL}/posts`, {
         headers: { Authorization: `Bearer ${token}` },
       }),
       axios.get(`${API_URL}/collections`, {
         headers: { Authorization: `Bearer ${token}` },
       }),
     ]);


     if (!isMounted.current) return;


     // set user data
     if (userResponse.data?.user) {
       const user = userResponse.data.user;
       setUser(user);
       fetchFollowersCount(user._id);  
     }


     // set posts data
     const userPosts =
       postsResponse.data?.data?.filter((post) => post.userId === userResponse.data.user._id) || [];
     setDatabasePosts(userPosts);


     // set collections data
     if (Array.isArray(collectionsResponse.data)) {
       setCollectionData(collectionsResponse.data);
     } else {
       console.error("Collection data not found or invalid");
       setCollectionData([]);
     }
   } catch (error) {
     console.error("Error fetching user data:", error);
   } finally {
     setLoading(false);
     setRefreshing(false);
   }
 };


 const polishLookup = polishData.reduce((acc, polish) => {
   acc[polish._id] = polish;
   return acc;
 }, {});


 const loadLocalPosts = async () => {
   try {
     const localPostsJSON = await AsyncStorage.getItem(LOCAL_POSTS_KEY);
     const storedPosts = localPostsJSON ? JSON.parse(localPostsJSON) : [];
     setLocalPosts(storedPosts);
   } catch (error) {
     console.error("Error loading local posts:", error);
   }
 };


 const fetchCurrentUserId = async () => {
     const token = await AsyncStorage.getItem("token");
     const res = await axios.get(`${API_URL}/account`, {
       headers: { Authorization: `Bearer ${token}` }
     });
     if (res.data?.user) setCurrentUserId(res.data.user._id);
   };


 const handleRefresh = useCallback(async () => {
   setRefreshing(true);
   await loadUserData();
 }, []);


 const handleImagePress = (post) => {


   const now = Date.now();
   const DOUBLE_PRESS_DELAY = 300;


   if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
     // double tap detection
     if (post?.photoUri) {
     
       setSelectedImage(post);  
       setIsPostModalVisible(true);
     } else {
       Alert.alert("Image not available");
     }
   } else { 
     setLastTap(now);
   }
 };


 useEffect(() => {
   const loadInitialData = async () => {
     setLoading(true);
     await fetchPolishes();  
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
     fetchCurrentUserId();
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


 const deletePost = async (postId) => {
   try {
     const token = await getToken();
     if (!token) {
       alert("Please login again"); 
       navigation.navigate("Login");
       return;
     }
     setIsPostModalVisible(false);
     setSelectedImage(null);
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
    
     const response = await axios.delete(`${API_URL}/posts/${postToDelete}`, {
       headers: { Authorization: `Bearer ${token}` },
     });
    
     if (response.data.status === "okay") {
       setDatabasePosts(prev => prev.filter(post => post._id !== postToDelete));
       alert("Post deleted successfully!");
     } else {
       throw new Error(response.data.message || "Failed to delete post");
     }
   } catch (err) {
     console.error("Delete error:", err);
     alert(err.message || "Error deleting post.");
   } finally {
     setIsDeleteModalVisible(false);
     setPostToDelete(null);
   }
 };


 const handleDeleteCancel = () => {
   setIsDeleteModalVisible(false);
   setPostToDelete(null);
 };

 const handlePostModalClose = () => {
  setIsPostModalVisible(false);
  setSelectedImage(null);
 }


 const handlePolishNamePress = (polishId) => {
   setIsPostModalVisible(false);
   setSelectedImage(null);
   const item = polishLookup[polishId];
   if (item) {
     navigation.navigate("PolishScreen", { item });
   }
 };


 const handleBusinessNamePress = async (businessId) => {
   setIsPostModalVisible(false);
   setSelectedImage(null);
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

 // get followers count
 const fetchFollowersCount = useCallback(async (userId) => {
   try {
     setIsLoadingFollowers(true);
     const token = await getToken();
     const response = await axios.get(`${API_URL}/users/${userId}/followers`, {
       headers: { Authorization: `Bearer ${token}` }
     }); 
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
 
 const businessLookup = useMemo(() => {
   return businessData.reduce((acc, business) => {
     acc[business._id] = {
       name: business.businessName || business.name,
       location: business.businessLocation,
     };
     return acc;
   }, {});
 }, [businessData]);

 
 const handleProfilePicUpload = async () => {
   try { 
     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (status !== 'granted') {
       alert('Permission to access camera roll is required!');
       return;
     }

     // open cam roll
     let result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images,
       allowsEditing: true,
       aspect: [1, 1],   
       quality: 0.7,   
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
     // convert image to base64
     const base64Image = await FileSystem.readAsStringAsync(imageUri, {
       encoding: FileSystem.EncodingType.Base64,
     });
     const response = await axios.put(
       `${API_URL}/account/profile-picture`,
       { image: `data:image/jpeg;base64,${base64Image}` },
       { headers: { Authorization: `Bearer ${token}` } }
     );
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


 const fetchCollections = async () => {
   try {
     const token = await getToken();
     if (!token) {
       console.error("Token is missing.");
       return;
     }


     const response = await axios.get(`${API_URL}/collections`, {
       headers: { Authorization: `Bearer ${token}` },
     });


     if (Array.isArray(response.data)) {
       setCollectionData(response.data);
     } else {
       console.error("Invalid collections data:", response.data);
       setCollectionData([]);
     }
   } catch (error) {
     console.error("Error fetching collections:", error);
   }
 };


 const deleteCollection = async (collectionId) => {
   try {
     const token = await getToken();
     if (!token) {
       Alert.alert("Error", "Please login again");
       navigation.navigate("Login");
       return;
     }

     const response = await axios.delete(`${API_URL}/collection/${collectionId}`, {
       headers: { Authorization: `Bearer ${token}` },
     });

 
     if (response.status === 200 || response.status === 204) { 
       setCollectionData((prev) => prev.filter((c) => c._id !== collectionId));
       Alert.alert("Success", "Collection deleted successfully");
     } else {
       throw new Error("Failed to delete collection");
     }
   } catch (error) {
     console.error("Error deleting collection:", error);

 
     let errorMessage = "Failed to delete collection.";
     if (error.response) { 
       errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
     } else if (error.request) { 
       errorMessage = "No response from server. Please check your internet connection.";
     }
 
     Alert.alert("Error", errorMessage);
   }
 };


 const openCollectionsModal = () => {
   setCollectionModalVisible(true);
 };


 const closeCollectionsModal = () => {
   setCollectionModalVisible(false);
 };




 if (loading) {
   return (
     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
       <ActivityIndicator size="large" color="#E0E0E0" />
     </View>
   );
 }


 return (
   <View style={styles.container}>
     {/* Header */}
     <View style={styles.header}>
       <View style={styles.headerContent}>
         <TouchableOpacity
           onPress={openCollectionsModal}
           style={styles.albumHeaderButton}
         >
           <Ionicons name="albums-outline" size={24} color="white" />
         </TouchableOpacity>


         <TouchableOpacity
           onPress={() => navigation.navigate(user?.isBusiness ? "BusinessAccount" : "ClientAccount")}
           style={styles.headerButton}
         >
           <Ionicons name="settings-outline" size={24} color="white" />
         </TouchableOpacity>
       </View>
     </View>


     <View style={styles.bodyWrapper}>
       <View style={styles.profileCard}>
         {/* Profile content */}
       </View>
     </View>

 
     <View style={styles.profileCard}>
 <View style={styles.profileHeader}>
   <TouchableOpacity onPress={handleProfilePicUpload}>
     {/* Profile pic and cam button */}
     <View style={styles.profilePicWrapper}>
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
       </View>
       {/* Camera button positioned outside */}
       <View style={styles.editProfilePicIcon}>
         <Ionicons name="camera" size={16} color="white" />
       </View>
     </View>
   </TouchableOpacity>


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
               <ActivityIndicator size="small" color="#6e3b6e" />
             ) : (
               <>
                 <Text style={[
                   styles.statNumber,
                   followersCount > 0 && styles.clickableCount
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
               user?.following?.length && styles.clickableCount
             ]}>
               {user?.following?.length || 0}
             </Text>
             <Text style={styles.statLabel}>Following</Text>
           </TouchableOpacity>
         </View>
       </View>


       <View style={styles.profileInfo}>
         <Text style={styles.username}>@{user?.username}</Text>
         {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}


         <View style={[
           styles.accountTypeBadge,
           user?.isBusiness && styles.businessBadge
         ]}>
           <Text style={styles.accountTypeText}>
             {user?.isBusiness ? "BUSINESS ACCOUNT" : "PERSONAL ACCOUNT"}
           </Text>
         </View>
       </View>
     </View>


     {/* Posts */}
     <View style={styles.contentContainer}>
       <Text style={styles.sectionTitle}>Your Posts</Text>


       {mergedPosts.length === 0 ? (
         <View style={styles.emptyState}>
           <Ionicons name="camera-outline" size={60} color="#d8bfd8" />
           <Text style={styles.emptyStateText}>No Posts Yet</Text>
         </View>
       ) : (
         <FlatList
           data={mergedPosts}
           numColumns={3}
           keyExtractor={(item) => item._id}
           refreshControl={
             <RefreshControl
               refreshing={refreshing}
               onRefresh={handleRefresh}
               colors={['#6e3b6e']}
               tintColor="#6e3b6e"
             />
           }
           renderItem={({ item }) => (
             <TouchableOpacity
               style={styles.postItem}
               onPress={() => handleImagePress(item)}
               activeOpacity={0.8}
             >
               <Image
                 source={{ uri: item.photoUri }}
                 style={styles.postImage}
                 resizeMode="cover"
               />
               {!item.photoUri && (
                 <View style={styles.postPlaceholder}>
                   <Ionicons name="image-outline" size={30} color="#d8bfd8" />
                 </View>
               )}
             </TouchableOpacity>
           )}
         />
       )}
     </View>




     {/* Selected post modal */}
     <Modal
       visible={isPostModalVisible}
       transparent={true}
       animationType="fade"
       onRequestClose={handlePostModalClose}
     >
       {!selectedImage ? null : (
       <View style={styles.modalContainer}>
         <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
           <View style={styles.modalBackdrop} />
         </TouchableWithoutFeedback>


         <View style={styles.postModal}>
           <View style={styles.modalHeader}>
           <TouchableOpacity
               onPress={() => {
                 setSelectedImage(null);
                 deletePost(selectedImage._id);
               }}
               style={styles.modalDeleteButton}
             >
               <Ionicons name="trash-outline" size={24} color="#ff4444" />
             </TouchableOpacity>


             <Text style={styles.modalUsername}>@{selectedImage?.username}</Text>
              
             <TouchableOpacity
               onPress={() => {
                 setSelectedImage(null);
                 setIsPostModalVisible(false);
               }}
               style={styles.modalCloseButton}
             >
               <Ionicons name="close" size={28} color="#6e3b6e" />
             </TouchableOpacity>
            
           </View>


           <ScrollView>
             <Image
               source={{ uri: selectedImage?.photoUri }}
               style={styles.modalImage}
               resizeMode="contain"
             />


             <View style={styles.modalContent}>
             
               <View style={styles.postActions}>
                
 {/* Like Button with Count */}
 <TouchableOpacity 
   style={styles.likeButton}
 >
   <Ionicons
     name={selectedImage.likes?.includes(currentUserId) ? "heart" : "heart-outline"}
     size={24}
     color={selectedImage.likes?.includes(currentUserId) ? "#FF3B30" : "#333"}
   />
   </TouchableOpacity>
   <Text style={styles.actionCount}>
     {selectedImage.likes?.length || 0} {selectedImage.likes?.length === 1 ? "like" : "likes"}
   </Text>


 {/* Comment Button with Count */}
 <TouchableOpacity
  // onPress={() => toggleComments(item._id)}
   style={[styles.commentButton, styles.commentButton]}
 >
   <Ionicons
     name="chatbubble-outline"
     size={22}
     color="#333"
   />
   <Text style={styles.actionCount}>
     {selectedImage.comments?.length || 0} {selectedImage.comments?.length === 1 ? "comment" : "comments"}
   </Text>
 </TouchableOpacity>
</View>
<Text style={styles.modalCaption}>{selectedImage?.caption}</Text>
               <View style={styles.detailsContainer}>
 <ScrollView
   horizontal
   showsHorizontalScrollIndicator={false}
   contentContainerStyle={styles.polishScrollContainer}
 >
   {selectedImage?.polishIds && selectedImage?.polishIds.map(polishId => {
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


 {/* Business name and icon */}
 {selectedImage?.businessId && (
   <TouchableOpacity
     onPress={() => handleBusinessNamePress(selectedImage?.businessId)}
     style={[styles.businessDetailItem, styles.businessDetail]}
   >
     <Ionicons
       name="business-outline"
       size={16}   
       color="#333"
       style={styles.iconStyle}
     />
     <Text style={styles.detailText} numberOfLines={1}>
       {businessLookup[selectedImage.businessId]?.name || "Unknown Business"}
     </Text>
   </TouchableOpacity>
 )}
</View>
             </View>
           </ScrollView>
         </View>
       </View>
       )}
     </Modal>




     {/* Delete confirmation modal */} 
<Modal
  transparent
  visible={isDeleteModalVisible}
  animationType="fade"
  onRequestClose={handleDeleteCancel}
>
  <TouchableWithoutFeedback onPress={handleDeleteCancel}>
    <View style={styles.confirmationModalBackdrop}>
      <TouchableWithoutFeedback>
        <View style={styles.confirmationModal}>
          <View style={styles.confirmationContent}>
            <Ionicons 
              name="warning" 
              size={40} 
              color="#ff4444" 
              style={styles.warningIcon} 
            />
            <Text style={styles.confirmationTitle}>Delete Post?</Text>
            <Text style={styles.confirmationText}>
              This action cannot be undone
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelButton]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmButton]}
                onPress={handleDeleteConfirmation}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>


     {/* Collections Modal */}
     <Modal
       visible={isCollectionModalVisible}
       animationType="slide"
       transparent={true}
       onRequestClose={closeCollectionsModal}
     >
       <View style={styles.fullModalContainer}>
         <View style={styles.collectionsModal}>
           <View style={styles.collectionsHeader}>
             <Text style={styles.collectionsTitle}>Your Collections</Text>
             <TouchableOpacity
               onPress={closeCollectionsModal}
               style={styles.closeModalButton}
             >
               <Ionicons name="close" size={24} color="#6e3b6e" />
             </TouchableOpacity>
           </View>


           {collectionData.length > 0 ? (
             <FlatList
               data={collectionData}
               keyExtractor={(item) => item._id}
               renderItem={({ item }) => (
                 <View style={styles.collectionItem}>
                   <TouchableOpacity
                     style={styles.collectionContent}
                     onPress={() => {
                       closeCollectionsModal();
                       navigation.navigate('CollectionScreen', { collectionId: item._id });
                     }}
                   >
                     <View style={styles.collectionIcon}>
                       <Ionicons name="folder" size={24} color="#6e3b6e" />
                     </View>


                     <View style={styles.collectionInfo}>
                       <Text style={styles.collectionName}>{item.name}</Text>
                       <Text style={styles.collectionCount}>
                         {item.polishes?.length || 0} {item.polishes?.length === 1 ? 'item' : 'items'}
                       </Text>
                     </View>
                   </TouchableOpacity>


                   <TouchableOpacity
                     onPress={() => {
                       Alert.alert(
                         "Delete Collection",
                         `Are you sure you want to delete "${item.name}"?`,
                         [
                           { text: "Cancel", style: "cancel" },
                           {
                             text: "Delete",
                             onPress: () => deleteCollection(item._id),
                             style: "destructive"
                           }
                         ]
                       );
                     }}
                     style={styles.collectionDeleteButton}
                   >
                     <Ionicons name="trash-outline" size={20} color="#ff4444" />
                   </TouchableOpacity>
                 </View>
               )}
             />
           ) : (
             <View style={styles.emptyCollections}>
               <Ionicons name="albums-outline" size={60} color="#d8bfd8" />
               <Text style={styles.emptyCollectionsText}>No collections yet</Text>
             
             </View>
           )}
         </View>
       </View>
     </Modal>
   </View>
 );
};


const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#f2f2f2',
 },


 // Header
 header: {
   backgroundColor: '#6e3b6e',
   paddingTop: 30,
   paddingBottom: 80,
   paddingHorizontal: 15,
   borderBottomLeftRadius: 20,
   borderBottomRightRadius: 20,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.2,
   shadowRadius: 8,
   elevation: 5,
 },
 headerContent: {
   flexDirection: 'row',
   justifyContent: 'flex-end',
   alignItems: 'center',
 },
 headerButton: {
   marginLeft: 12,  // Reduced from 20
     padding: 5,
   },
   albumHeaderButton: {
   marginLeft: 12,  // Match the other button's margin
   paddingVertical: 5,
   },


 // Profile Card
 profileCard: {
   position: 'absolute',
   top: 70,
   left: 20,
   right: 20,
   backgroundColor: 'white',
   borderRadius: 15,
   padding: 20,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.15,
   shadowRadius: 8,
   elevation: 6,
   zIndex: 2,
 },
 profileHeader: {
   flexDirection: 'row',
   alignItems: 'center',
   marginBottom: 15,
 },
 profilePicWrapper: {
   position: 'relative', 
 },
 editProfilePicIcon: {
   position: 'absolute',
   paddingStart: 5,
   bottom: -6,     
   backgroundColor: 'rgba(110, 59, 110, 0.8)',
   borderRadius: 12,
   padding: 6,     
   zIndex: 1,     
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 2,
   elevation: 3,
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
   marginRight: 20,
   borderWidth: 3,
   borderColor: '#6e3b6e',
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
   backgroundColor: '#6e3b6e',
 },
 statsContainer: {
   flexDirection: 'row',
   flex: 1,
   justifyContent: 'space-between',
   alignItems: 'center',  
 },
 statItem: {
   flex: 1, 
   alignItems: 'center',
   justifyContent: 'center',  
   paddingHorizontal: 5,  
 },
 statNumber: {
   fontWeight: 'bold',
   fontSize: 20,
   marginBottom: 4,
   color: '#333',
   textAlign: 'center',  
   width: '100%',  
 },
 statLabel: {
   fontSize: 14,
   color: '#666',
   textAlign: 'center',  
   width: '100%', 
 },
 clickableCount: {
   color: '#333',
 },
 profileInfo: {
   marginTop: 10,
 },
 username: {
   fontWeight: 'bold',
   fontSize: 22,
   marginBottom: 5,
   color: '#333',
 },
 bio: {
   fontSize: 15,
   marginBottom: 15,
   color: '#555',
   lineHeight: 22,
 },
 accountTypeBadge: {
   backgroundColor: '#f0e6ff',
   paddingVertical: 6,
   paddingHorizontal: 12,
   borderRadius: 15,
   alignSelf: 'flex-start',
 },
 businessBadge: {
   backgroundColor: '#e6f0ff',
 },
 accountTypeText: {
   fontSize: 12,
   color: '#6e3b6e',
   fontWeight: '700',
   textTransform: 'uppercase',
 },


 // Content
 contentContainer: {
   flex: 1,
   position: 'absolute',
   top: 265,
   left: 20,
   right: 20,
   marginTop: 10,
   paddingTop: 30,
   paddingHorizontal: 15,
 },
 sectionTitle: {
   fontSize: 18,
   fontWeight: '600',
   color: '#6e3b6e',
   marginBottom: 15,
   paddingLeft: 5,
 },


 // Posts Grid
 emptyState: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   padding: 40,
 },
 emptyStateText: {
   fontSize: 18,
   color: '#666',
   marginVertical: 15,
 },
 primaryButton: {
   backgroundColor: '#6e3b6e',
   paddingVertical: 12,
   paddingHorizontal: 25,
   borderRadius: 25,
   flexDirection: 'row',
   alignItems: 'center',
   marginTop: 15,
   shadowColor: '#6e3b6e',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.3,
   shadowRadius: 6,
   elevation: 5,
 },
 primaryButtonText: {
   color: 'white',
   fontWeight: '600',
   fontSize: 16,
   marginRight: 8,
 },
 postItem: {
   width: '32%',
   aspectRatio: 1,
   margin: '0.66%',
   backgroundColor: '#fafafa',
   borderRadius: 8,
   overflow: 'hidden',
 },
 postImage: {
   width: '100%',
   height: '100%',
 },
 postPlaceholder: {
   width: '100%',
   height: '100%',
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#f5f5f5',
 },


 // Modals
 modalContainer: {
   flex: 1,
   backgroundColor: 'rgba(0,0,0,0.8)',
   justifyContent: 'center',
 },
 modalBackdrop: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
 },
 postModal: {
   backgroundColor: 'white',
   marginHorizontal: 20,
   borderRadius: 15,
   maxHeight: '80%',
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.3,
   shadowRadius: 10,
   elevation: 10,
 },
 modalHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#f0f0f0',
 },
 modalCloseButton: {
   padding: 5,
 },
 modalUsername: {
   fontWeight: 'bold',
   fontSize: 16,
   color: '#6e3b6e',
 },
 modalDeleteButton: {
   padding: 5,
 },
 modalImage: {
   width: '100%',
   height: 350,
 },
 modalContent: {
   paddingHorizontal: 20,
   paddingTop: 5,
   paddingBottom: 20
 },
 modalCaption: {
   fontSize: 16,
   marginBottom: 15,
   lineHeight: 22,
   color: '#333',
 },
 postActions: {
   flexDirection: 'row',
   alignItems: 'center',
   paddingVertical: 8,
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
 detailsContainer: {
   marginTop: 12,  
 },
 polishScrollContainer: {
   paddingVertical: 4,
   paddingRight: 16,  
 }, 
  detailItem: {
   flexDirection: 'row',
   alignItems: 'center',
   backgroundColor: '#f5f5f5',
   borderRadius: 16,
   paddingVertical: 6,
   paddingHorizontal: 10,
   marginRight: 8,  
   height: 32,  
 },
 businessDetail: {
   marginTop: 4,   
 },
 iconStyle: {
   marginRight: 8,  
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
   alignSelf: 'flex-start', 
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
   maxWidth: 120,  
 },
 divider: {
   color: '#ccc',
   marginHorizontal: 5,
 },
 businessText: {
   fontSize: 15,
   color: '#6e3b6e',
   fontWeight: '500',
 },


 // Confirmation Modal
 confirmationModalBackdrop: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
},
confirmationModal: {
  width: '80%',
  backgroundColor: 'white',
  borderRadius: 15,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center'
},
 confirmationContent: {
   backgroundColor: 'white',
   borderRadius: 15,
   width: '80%',
   padding: 25,
   alignItems: 'center',
  justifyContent: 'center'
 },
 warningIcon: {
   marginBottom: 15,
 },
 confirmationTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   marginBottom: 5,
   color: '#333',
   textAlign: 'center',
 },
 confirmationText: {
   fontSize: 16,
   marginBottom: 20,
   color: '#666',
   textAlign: 'center',
 },
 confirmationButtons: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   width: '100%',
 },
 confirmationButton: {
   flex: 1,
   padding: 12,
   borderRadius: 8,
   alignItems: 'center',
 },
 cancelButton: {
   backgroundColor: '#f0f0f0',
   marginRight: 10,
 },
 confirmButton: {
   backgroundColor: '#ff4444',
   marginLeft: 10,
 },
 cancelButtonText: {
   color: '#333',
   fontWeight: '600',
 },
 confirmButtonText: {
   color: 'white',
   fontWeight: '600',
 },


 // Collections Modal
 fullModalContainer: {
   flex: 1,
   backgroundColor: 'rgba(0,0,0,0.5)',
   justifyContent: 'center',
   alignItems: 'center',  
 },
 collectionsModal: {
   backgroundColor: 'white',
   borderRadius: 15,
   width: '90%',   
   maxHeight: '80%',
   padding: 20,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 4,
   elevation: 5,
 },
 collectionsHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   marginBottom: 20,
   paddingBottom: 10,
   borderBottomWidth: 1,
   borderBottomColor: '#f0f0f0',
 },
 collectionsTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#6e3b6e',
 },
 closeModalButton: {
   padding: 5,
 },
 collectionItem: {
   backgroundColor: 'white',
   borderRadius: 12,
   marginBottom: 12,
   flexDirection: 'row',
   alignItems: 'center',
   padding: 12,
   borderWidth: 1,
   borderColor: '#f0f0f0',
 },
 collectionContent: {
   flex: 1,
   flexDirection: 'row',
   alignItems: 'center',
 },
 collectionIcon: {
   backgroundColor: '#f0e6ff',
   width: 40,
   height: 40,
   borderRadius: 20,
   justifyContent: 'center',
   alignItems: 'center',
   marginRight: 15,
 },
 collectionInfo: {
   flex: 1,
 },
 collectionName: {
   fontSize: 16,
   fontWeight: '600',
   color: '#333',
   marginBottom: 2,
 },
 collectionDescription: {
   fontSize: 14,
   color: '#666',
   marginBottom: 2,
 },
 collectionCount: {
   fontSize: 12,
   color: '#999',
 },
 collectionDeleteButton: {
   padding: 8,
   marginLeft: 10,
 },
 emptyCollections: {
   alignItems: 'center',
   padding: 40,
 },
 emptyCollectionsText: {
   textAlign: 'center',
   color: '#666',
   marginVertical: 15,
   fontSize: 16,
 },
 bodyWrapper: {
   flex: 1,
   marginTop: -30,  
   paddingHorizontal: 20,
   paddingBottom: 10,
 },
});


export default AccountScreen;
