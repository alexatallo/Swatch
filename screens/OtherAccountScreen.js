import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
View, Text, Button, ScrollView, Modal, Platform, ActivityIndicator, StyleSheet, FlatList, Image,
TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Alert, Linking, TextInput, KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL }  from '@env';
import {GOOGLE_API}  from '@env';


const getToken = async () => {
return await AsyncStorage.getItem("token");
};








const calculateDistance = (userLat, userLng, businessLat, businessLng) => {
const radian = Math.PI / 180;
const R = 6371; // Radius of Earth in km
 const dLat = (businessLat - userLat) * radian;
const dLng = (businessLng - userLng) * radian;








const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * radian) * Math.cos(businessLat * radian) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));








return R * c; // Distance in km
};








const geocodeAddress = async (address) => {
try {
  console.log('🗺️ Geocoding address:', address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].geometry.location;
  }
  throw new Error('Address not found');
} catch (error) {
  console.error('🔴 Geocoding failed:', error.message);
  throw error;
}
};








const OtherAccountScreen = () => {
const route = useRoute();
const navigation = useNavigation();
 const isMounted = useRef(true);
const [isFollowing, setIsFollowing] = useState(false);
const [followLoading, setFollowLoading] = useState(false);
const [likesModalVisible, setLikesModalVisible] = useState(false);
const [selectedLikes, setSelectedLikes] = useState([]);
const [visibleComments, setVisibleComments] = useState({});
const { item: routeItem } = route.params || {};
const [userLocation, setUserLocation] = useState(null);
const [businessLocation, setBusinessLocation] = useState(null);
const [distance, setDistance] = useState(null);
  //inventory
  const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
  const [collections, setCollections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [filteredPolishes, setFilteredPolishes] = useState([])
  const [polishData, setPolishData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [businessId, setBusinessId] = useState(null);








// State management
const [state, setState] = useState({
  loading: true,
  refreshing: false,
  followLoading: false,
  distanceLoading: false,
  accountData: null,
  user: {
    ...routeItem,
    followersCount: routeItem.followersCount || 0,  
    followingCount: routeItem.followingCount || 0
  },
  distance: null,
  databasePosts: [],
  polishData: [],
  isFollowing: false,
  currentUserId: null,
  businessData: [],
});








const polishLookup = useMemo(() => {
  const lookup = {};
  state.polishData.forEach(polish => {
    if (polish?._id) lookup[polish._id] = polish;
  });
  return lookup;
}, [state.polishData]);




const businessLookup = useMemo(() => {
 return state.businessData.reduce((acc, business) => {
   acc[business._id] = {
     name: business.businessName || business.name,
     location: business.businessLocation,
   };
   return acc;
 }, {});
}, [state.businessData]);




// Add business fetching function
const fetchBusinesses = async () => {
 try {
   const token = await getToken();
   const response = await axios.get(`${API_URL}/businesses`, {
     headers: { Authorization: `Bearer ${token}` }
   });
   updateState({ businessData: response.data?.businesses || [] });
 } catch (error) {
   console.error("Error fetching businesses:", error);
 }
};








const updateState = (newState) => {
  if (isMounted.current) {
    setState(prev => ({
      ...prev,
      ...(typeof newState === 'function' ? newState(prev) : newState)
    }));
  }
};








// Helper functions
const fetchAccountData = async () => {
  try {
    const token = await getToken();
    if (!token) return null;
 
    const response = await axios.get(`${API_URL}/account`, {
      headers: { Authorization: `Bearer ${token}` }
    });
 
    updateState({
      accountData: response.data?.user,
      currentUserId: response.data?.user?._id
    });
 
    return response.data?.user;
  } catch (error) {
    console.error('Account fetch error:', error);
    return null;
  }
};
 const fetchBusinessData = async (userId) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${API_URL}/businesses/by-user/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
 
    console.log('🏢 Business API response:', {
      status: response.status,
      hasLocation: !!response.data?.businessLocation
    });
 
    return response.data;
  } catch (error) {
    console.error('Business fetch error:', error);
    throw error;
  }
};








const fetchPolishes = async () => {
  try {
    const token = await getToken();
    if (!token) return;
 
    const response = await axios.get(`${API_URL}/polishes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    updateState({ polishData: response.data?.data || [] });
  } catch (error) {
    console.error('Polishes fetch error:', error);
  }
};








const fetchPosts = async () => {
  try {
    const token = await getToken();
    if (!token || !state.user?._id) return;
 
    const response = await axios.get(`${API_URL}/posts/user/${state.user._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    updateState({ databasePosts: response.data?.data || [] });
  } catch (error) {
    console.error("Posts fetch error:", error);
  } finally {
    updateState({ loading: false, refreshing: false });
  }
};








const checkFollowingStatus = async () => {
  try {
    const token = await getToken();
    if (!token || !state.user?._id) return;
 
    const response = await axios.get(`${API_URL}/users/is-following/${state.user._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
 
    if (response.data?.isFollowing !== undefined) {
      updateState({ isFollowing: response.data.isFollowing });
    }
  } catch (error) {
    console.error("Follow status error:", error);
  }
};








const calculateRealDistance = async (userLocation, businessLocation) => {
  if (userLocation && businessLocation) {
    const dist = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      businessLocation.lat,
      businessLocation.lng
    );
    setDistance(dist);
  }
};




useEffect(() => {
  const loadAllData = async () => {
    try {
      const accountData = await fetchAccountData();
      const userAddress = accountData?.location;
     
      if (state.user?.isBusiness) {
        const business = await fetchBusinessData(state.user._id);
        const businessAddress = business?.businessLocation;
        fetchCollections(state.user._id);


        if (userAddress && businessAddress) {
          const userLoc = await geocodeAddress(userAddress);
          const businessLoc = await geocodeAddress(businessAddress);
          setUserLocation(userLoc);
          setBusinessLocation(businessLoc);
        }
      }


     
      await fetchUpdatedFollowCounts();


      updateState({ accountData, loading: false });
      await Promise.all([fetchPolishes(), fetchPosts(), fetchBusinesses()]);
    } catch (error) {
      console.error('Load error:', error);
    }
  };
  loadAllData();
}, [state.user]);
useEffect(() => {
 if (userLocation && businessLocation) {
   calculateRealDistance(userLocation, businessLocation);
 }
}, [userLocation, businessLocation]);












useEffect(() => {
  if (userLocation && businessLocation) {
    calculateRealDistance(userLocation, businessLocation);
  }
}, [userLocation, businessLocation]);








useEffect(() => {
  const initializeUserData = async () => {
    await fetchCurrentUserId();
    await checkFollowingStatus();
  };
   if (state.user?._id) {
    initializeUserData();
  }
}, [state.user?._id]);








// Handlers
const handleRefresh = () => {
  updateState({ refreshing: true });
  fetchPosts();
};








const toggleFollow = async () => {
  if (!state.user?._id || state.followLoading) return;
   updateState({ followLoading: true });
  try {
    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "You need to be logged in to follow users");
      return;
    }
     const endpoint = state.isFollowing ? 'unfollow' : 'follow';
    await axios.post(
      `${API_URL}/users/${state.user._id}/${endpoint}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
     
    updateState({ isFollowing: !state.isFollowing });
    await fetchUpdatedFollowCounts();
 
  } catch (error) {
    console.error("Follow error:", error);
    Alert.alert("Error", "Something went wrong. Please try again.");
  } finally {
    updateState({ followLoading: false });
  }
};


const fetchUpdatedFollowCounts = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${API_URL}/users/${state.user._id}/follow-counts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
   
    if (response.data) {
      updateState(prev => ({
        user: {
          ...prev.user,  
          followersCount: response.data.followersCount || 0,
          followingCount: response.data.followingCount || 0
        }
      }));
    }
  } catch (err) {
    console.error("Failed to update follow counts:", err);
  }
};
 const fetchCurrentUserId = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/account`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.data?.user?._id) {
    updateState({ currentUserId: response.data.user._id });
  }
};








const handlePolishNamePress = (polishId) => {
  const item = polishLookup[polishId];
  if (item) {
    navigation.navigate("PolishScreen", { item });
  }
};








const handleViewFollowers = () => {
  navigation.navigate("Followers", { userId: state.user._id });
};








const handleViewFollowing = () => {
  navigation.navigate("Following", { userId: state.user._id });
};


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




const toggleLike = async (postId) => {
  try {
    if (!state.currentUserId) return;
     const token = await AsyncStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/posts/${postId}/like`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    updateState(prev => ({
      databasePosts: prev.databasePosts.map(post =>
        post._id === postId ? response.data : post
      )
    }));
  } catch (err) {
    console.error("Like failed:", err);
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









const toggleComments = (postId) => {
  setVisibleComments(prev => ({
    ...prev,
    [postId]: !prev[postId],
  }));
};








const submitComment = async (postId, commentText) => {
  if (!commentText || commentText.trim() === "") return;








  try {
    const token = await getToken();
    const response = await axios.post(
      `${API_URL}/posts/${postId}/comments`,
      { text: commentText },
      { headers: { Authorization: `Bearer ${token}` } }
    );








    const newComment = response.data;
    updateState(prev => ({
      databasePosts: prev.databasePosts.map(post =>
        post._id === postId
          ? {
              ...post,
              comments: [...(post.comments || []), newComment],
              newComment: "",
            }
          : post
      )
    }));
  } catch (err) {
    console.error("Failed to post comment:", err);
    Alert.alert("Error", "Failed to post comment");
  }
};




const updatePostCommentText = (postId, text) => {
  updateState(prev => ({
    databasePosts: prev.databasePosts.map(post =>
      post._id === postId ? { ...post, newComment: text } : post
    )
  }));
};




const fetchCollections = async (userId) => {
 try {
     const token = await getToken();
     const response = await axios.get(
         `${API_URL}/collections/${userId}`, 
         { headers: { Authorization: `Bearer ${token}` } }
     );
     setCollections(response.data || []);
 } catch (error) {
     console.error('Collections fetch error:', error);
 }
};




 const fetchPolishesForCollection = async (collectionId) => {
   try {
     const token = await getToken();
     const response = await axios.get(
     `${API_URL}/collections/${collectionId}/polishes`,
       { headers: { Authorization: `Bearer ${token}` } }
     );




     if (response.data.status === "okay" && Array.isArray(response.data.data)) {
       console.log("collections:", response.data.data);
       setPolishData(response.data.data);
       setFilteredPolishes(response.data.data);
     }
   } catch (error) {
     console.error('Polishes fetch error:', error);
   }
 };





const handleSearch = (text) => {
  setSearchQuery(text);
};









const filteredCollections = useMemo(() => {
 if (!searchQuery) return collections;
 return collections.filter(collection =>
   collection.name.toLowerCase().includes(searchQuery.toLowerCase())
 );
}, [collections, searchQuery]);





const handleCollectionPress = (collection) => {
 setSelectedCollection(collection);
 fetchPolishesForCollection(collection._id);
};









const renderItem = ({ item }) => (
 <View style={styles.postCard}>
   {item.photoUri ? (
     <TouchableWithoutFeedback onPress={() => navigation.navigate('PostDetail', { postId: item._id })}>
       <Image
         source={{ uri: item.photoUri }}
         style={styles.postImage}
         resizeMode="cover"
       />
     </TouchableWithoutFeedback>
   ) : (
     <View style={styles.noImagePlaceholder}>
       <Text>No Image Available</Text>
     </View>
   )}




   <View style={styles.postActions}>
     <TouchableOpacity
       onPress={() => toggleLike(item._id)}
       style={styles.likeButton}
     >
       <Ionicons
         name={(item.likes || []).includes(state.currentUserId) ? "heart" : "heart-outline"}
         size={24}
         color={(item.likes || []).includes(state.currentUserId) ? "#FF3B30" : "#333"}
       />
     </TouchableOpacity>
     <TouchableOpacity onPress={() => showLikesModal(item._id)}>
       <Text style={styles.actionCount}>
         {(item.likes || []).length} {(item.likes || []).length === 1 ? "like" : "likes"}
       </Text>
     </TouchableOpacity>




    
     <TouchableOpacity
       onPress={() => toggleComments(item._id)}
       style={styles.commentButton}
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




   <Text style={styles.postCaption}>{item.caption}</Text>




   <View style={styles.detailsContainer}>
   <ScrollView
       horizontal
       showsHorizontalScrollIndicator={false}
       contentContainerStyle={styles.polishScrollContainer}
     >
 {item.polishIds && item.polishIds.map((polishId, index) => {
   const polish = polishLookup[polishId];
   if (!polish) return null;
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
         {polish.brand || "Brand"}: {polish.name || "Name"}
       </Text>
     </TouchableOpacity>
   );
 })}
 </ScrollView>




 
 {item.businessId && (
  <TouchableOpacity
        onPress={() => handleBusinessNamePress(item.businessId)}
        style={[styles.businessDetailItem, styles.businessDetail]}
      >
        <Ionicons
          name="business-outline"
          size={16}  
          color="#333"
          style={styles.iconStyle}
        />
        <Text style={styles.detailText} numberOfLines={1}>
          {businessLookup[item.businessId]?.name || "Unknown Business"}
        </Text>
      </TouchableOpacity>
    )}
  </View>


   {visibleComments[item._id] && (
     <View style={styles.commentsContainer}>
       {item.comments && item.comments.length > 0 ? (
         item.comments.map((comment, idx) => (
           <View key={idx} style={styles.comment}>
             <Text style={styles.commentUsername}>@{comment.username}: </Text>
             <Text style={styles.commentText}>{comment.text}</Text>
           </View>
         ))
       ) : (
         <Text style={styles.noComments}>No comments yet</Text>
       )}

       <View style={styles.commentInputContainer}>
         <TextInput
           style={styles.commentInput}
           placeholder="Write a comment..."
           placeholderTextColor="#999"
           value={item.newComment || ""}
           onChangeText={(text) => updatePostCommentText(item._id, text)}
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
);








if (state.loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#A020F0" />
    </View>
  );
}








if (!state.user) {
  return (
    <View style={styles.errorContainer}>
      <Text>No user data available</Text>
    </View>
  );
}








return (
  <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  style={{ flex: 1 }}
  keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
>
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
     
          </TouchableOpacity>
           <View style={styles.headerSpacer} />
           <TouchableOpacity style={styles.headerButton}>
       
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.profilePicContainer}>
            {state.user.profilePic ? (
              <Image
                source={{ uri: state.user.profilePic }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Ionicons name="person" size={40} color="white" />
              </View>
            )}
          </View>
           <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{state.databasePosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
             <TouchableOpacity
              style={styles.statItem}
              onPress={handleViewFollowers}
            >
              <Text style={styles.statNumber}>
  {state.user.followersCount || 0}
</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
             <TouchableOpacity
              style={styles.statItem}
              onPress={handleViewFollowing}
            >
              <Text style={styles.statNumber}>
                {state.user.followingCount || 0}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>
         <View style={styles.profileInfo}>
          <Text style={styles.username}>@{state.user.username}</Text>
          {state.user.bio && <Text style={styles.bio}>{state.user.bio}</Text>}
          {distance != null && state?.user?.isBusiness && ( 
  <>
    <Text style={{ marginTop: 5, color: '#555' }}>
    <Ionicons name="location" size={16} color="#6e3b6e" style={{ marginRight: 5 }} />
    {(distance * 0.621371).toFixed(2)} miles away
    </Text>
  </>
)}
           <View
            style={[
              styles.accountTypeBadge,
              state.user.isBusiness && styles.businessBadge,
            ]}
          >
            <Text style={styles.accountTypeText}>
              {state.user.isBusiness ? "BUSINESS ACCOUNT" : "PERSONAL ACCOUNT"}
            </Text>
          </View>
        </View>
      </View>
    
      <View style={styles.followButtonContainer}>
        <TouchableOpacity
          style={[
            styles.followButton,
            state.isFollowing && styles.followingButton,
          ]}
          onPress={toggleFollow}
          disabled={state.followLoading}
        >
          {state.followLoading ? (
            <ActivityIndicator
              size="small"
              color={state.isFollowing ? "#555" : "#fff"}
            />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                state.isFollowing && styles.followingButtonText,
              ]}
            >
              {state.isFollowing ? "Following" : "Follow"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>
          {state.user.isBusiness ? "Posts" : "Posts"}
        </Text>
         {state.databasePosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet.</Text>
          </View>
        ) : (
          <FlatList
            data={state.databasePosts}
            keyExtractor={(item, index) => item._id || `post-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.flatListContent}
            style={styles.flatList}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={handleRefresh}
                tintColor="#A020F0"
              />
            }
          />
        )}
      </View>
     
      <Modal
        visible={likesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLikesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Liked By</Text>
            <FlatList
              data={selectedLikes}
              keyExtractor={(item) => item._id || Math.random().toString()}
              renderItem={({ item }) => (
                <View style={styles.likerItem}>
                  <Text style={styles.likerName}>@{item.username}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noLikes}>No likes yet</Text>
              }
            />
            <TouchableOpacity
              onPress={() => setLikesModalVisible(false)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {state.user?.isBusiness && (
        <TouchableOpacity
          style={styles.inventoryButton}
          onPress={() => setIsInventoryModalVisible(true)}
        >
          <Text style={styles.inventoryButtonText}>View Inventory</Text>
        </TouchableOpacity>
      )}
     
      <Modal
        visible={isInventoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsInventoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inventoryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCollection ? selectedCollection.name : "Collections"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedCollection) {
                    setSelectedCollection(null);
                  } else {
                    setIsInventoryModalVisible(false);
                  }
                }}
              >
                <Ionicons name="close" size={24} color="#6e3b6e" />
              </TouchableOpacity>
            </View>
             {!selectedCollection ? (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={20} color="#6e3b6e" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search collections..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                </View>
                 <FlatList
                  data={filteredCollections}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.collectionItem}
                      onPress={() => handleCollectionPress(item)}
                    >
                      <View style={styles.collectionIcon}>
                        <Ionicons name="folder" size={24} color="#6e3b6e" />
                      </View>
                      <View style={styles.collectionInfo}>
                        <Text style={styles.collectionName}>{item.name}</Text>
                        <Text style={styles.collectionCount}>
                          {item.polishes?.length || 0}{" "}
                          {item.polishes?.length === 1 ? "polish" : "polishes"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyCollections}>
                      <Ionicons
                        name="albums-outline"
                        size={50}
                        color="#d8bfd8"
                      />
                      <Text style={styles.emptyCollectionsText}>
                        No collections found
                      </Text>
                    </View>
                  }
                />
              </>
            ) : (
              <>
                <FlatList
                  data={filteredPolishes}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.polishCard}
                      onPress={() => {
                        setIsInventoryModalVisible(false);
                        setSelectedCollection(null);
                        navigation.navigate("PolishScreen", { item }); 
                      }}
                    >
                      <Image
                        source={{ uri: item.picture }}
                        style={styles.modalImage}
                      />
                      <View style={styles.textContainer}>
                        <Text style={styles.title}>
                          {item.name || "No name available"}
                        </Text>
                        <Text style={styles.text}>
                          Brand: {item.brand || "Unknown"}
                        </Text>
                        <Text style={styles.text}>
                          Color: {item.hex || "N/A"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyPolishes}>
                      <Ionicons
                        name="color-palette-outline"
                        size={50}
                        color="#d8bfd8"
                      />
                      <Text style={styles.emptyPolishesText}>
                        No polishes in this collection
                      </Text>
                    </View>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  </KeyboardAvoidingView>
);
}




const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "#f8f8f8",
},
header: {
  backgroundColor: '#6e3b6e',
  paddingTop: 50,
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
  justifyContent: 'space-between',
  alignItems: 'center',
},
headerSpacer: {
  flex: 1,
},
headerButton: {
  padding: 5,
},
backButton: {
  padding: 5,
},
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
  borderColor: '#f0e6ff',
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
},
statItem: {
  alignItems: 'center',
  minWidth: 80,
},
statNumber: {
  fontWeight: 'bold',
  fontSize: 20,
  marginBottom: 4,
  color: '#333',
},
statLabel: {
  fontSize: 14,
  color: '#666',
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
// Follow Button
followButtonContainer: {
  position: 'absolute',
  top: 220,
  left: 280,
  zIndex: 3,
},
followButton: {
  backgroundColor: '#6e3b6e',
  paddingVertical: 8,
  paddingHorizontal: 25,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  height: 40,
  minWidth: 120,
  shadowColor: '#6e3b6e',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
followingButton: {
  backgroundColor: '#eee',
  borderWidth: 1,
  borderColor: '#ddd',
},
followButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
followingButtonText: {
  color: '#555',
},
contentContainer: {
  flex: 1,
  marginTop: 150, 
  paddingHorizontal: 15,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#6e3b6e',
  marginBottom: 15,
  paddingLeft: 5,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
errorContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
backButton: {
  marginRight: 10,
},
headerText: {
  fontSize: 20,
  fontWeight: 'bold',
  flex: 1,
  textAlign: 'center',
},
profileSection: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
profileInfo: {
  flex: 1,
},
username: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 5,
},
userType: {
  fontSize: 16,
  color: '#666',
  marginBottom: 5,
},
postDetails: {
 fontSize: 14,
 color: '#6e3b6e',
 fontWeight: '500',
 marginRight: 6,
 flexShrink: 1,
},
followButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  paddingHorizontal: 20,
  marginTop: 10,
},
followButton: {
  backgroundColor: '#A020F0',
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  height: 40,
  minWidth: 100,
},
followingButton: {
  backgroundColor: '#eee',
  borderWidth: 1,
  borderColor: '#ddd',
},
followButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},
followingButtonText: {
  color: '#555',
},
secondaryButton: {
  backgroundColor: '#ddd',
  paddingVertical: 8,
  paddingHorizontal: 15,
  borderRadius: 20,
},
secondaryButtonText: {
  color: '#333',
  fontWeight: 'bold',
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
errorContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
flatList: {
  flex: 1,
},
flatListContent: {
  paddingBottom: 20,
  flexGrow: 1, 
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  backgroundColor: 'white',
  borderRadius: 16,
  padding: 20,
  width: '80%',
  maxHeight: '60%',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},
likerItem: {
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
likerName: {
  fontSize: 16,
},
noLikes: {
  textAlign: 'center',
  color: '#999',
  padding: 20,
},
modalClose: {
  position: 'absolute',
  top: 10,
  right: 10,
  padding: 5,
},
postCard: {
  backgroundColor: "#fff",
  padding: 15,
  borderRadius: 15,
  marginVertical: 10,
  marginHorizontal: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
postImage: {
  width: '100%',
  height: 300,
  borderRadius: 8,
  marginBottom: 10,
},
noImagePlaceholder: {
  width: '100%',
  height: 300,
  borderRadius: 8,
  marginBottom: 10,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#eee',
},
postCaption: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 10,
},
polishDetailsContainer: {
 flexDirection: 'row',
 alignItems: 'center',
 marginTop: 10,
 flexWrap: 'wrap',
},
postDetails: {
  fontSize: 14,
  color: '#666',
  marginRight: 10,
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
},

postActions: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
likeButton: {
  marginRight: 10,
},
commentButton: {
  marginLeft: 20,
  flexDirection: 'row',
  alignItems: 'center',
},
actionCount: {
  marginLeft: 6,
  fontSize: 14,
  color: '#333',
},
commentsContainer: {
  marginTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#eee',
  paddingTop: 10,
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
  backgroundColor: '#6A5ACD',
  borderRadius: 20,
  paddingHorizontal: 16,
  justifyContent: 'center',
  opacity: 0.7,
},
inventoryButton: {
  backgroundColor: '#6e3b6e',
  padding: 15,
  borderRadius: 8,
  margin: 20,
  alignItems: 'center',
},
inventoryButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
inventoryModal: {
  backgroundColor: 'white',
  width: '90%',
  maxHeight: '80%',
  borderRadius: 15,
  padding: 20,
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#6e3b6e',
},
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f5f5f5',
  borderRadius: 10,
  paddingHorizontal: 15,
  paddingVertical: 10,
  marginBottom: 15,
},
searchInput: {
  flex: 1,
  marginLeft: 10,
  fontSize: 16,
},
collectionItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
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
polishDetailsContainer: {
 flexDirection: 'row',
 alignItems: 'center',
 marginTop: 10,
 flexWrap: 'wrap',
},
colorCircle: {
 width: 16,
 height: 16,
 borderRadius: 8,
 marginRight: 8,
},
postDetails: {
 fontSize: 14,
 color: '#6e3b6e',
 fontWeight: '500',
},
collectionName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
},
collectionCount: {
  fontSize: 14,
  color: '#666',
},
emptyCollections: {
  alignItems: 'center',
  padding: 40,
},
emptyCollectionsText: {
  marginTop: 15,
  color: '#666',
  fontSize: 16,
},
polishCard: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
modalImage: {
  width: 60,
  height: 60,
  borderRadius: 8,
  marginRight: 12,
},
textContainer: {
  flex: 1,
},
title: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
},
text: {
  fontSize: 14,
  color: '#666',
  marginTop: 4,
},
emptyPolishes: {
  alignItems: 'center',
  padding: 40,
},
emptyPolishesText: {
  marginTop: 15,
  color: '#666',
  fontSize: 16,
},
commentSubmitText: {
  color: 'white',
  fontWeight: '500',
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
  alignSelf: 'flex-start', 
},
businessDetail: {
 marginTop: 4, 
},
detailText: {
  fontSize: 12,
  color: '#333',
  maxWidth: 120,
},
iconStyle: {
 marginRight: 8,
},
detailsContainer: {
 marginTop: 12,  
},
polishScrollContainer: {
  paddingVertical: 4,
  paddingRight: 16, 
},


});


export default OtherAccountScreen;