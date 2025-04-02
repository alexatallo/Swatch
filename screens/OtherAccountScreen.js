import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Button, Modal, Platform, ActivityIndicator, StyleSheet, FlatList, Image,
  TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Alert, Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';
const getToken = async () => {
  return await AsyncStorage.getItem("token");
};
const calculateDistance = (userLat, userLng, businessLat, businessLng) => {
  // Calculate distance (in km) between the two points
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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=MY_API_KEY`;
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
  const { item: routeItem } = route.params || {};
  const [userLocation, setUserLocation] = useState(null);
const [businessLocation, setBusinessLocation] = useState(null);
const [distance, setDistance] = useState(null);

  // State management
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    followLoading: false,
    distanceLoading: false,
    accountData: null,
    user: routeItem,
    distance: null,
    databasePosts: [],
    polishData: [],
    isFollowing: false
  });

  // Memoized values
  const polishLookup = useMemo(() => {
    const lookup = {};
    state.polishData.forEach(polish => {
      if (polish?._id) lookup[polish._id] = polish;
    });
    return lookup;
  }, [state.polishData]);


  // Helper functions
  

  const updateState = (newState) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...newState }));
    }
  };

  const fetchAccountData = async () => {
    try {
      const token = await getToken();
      if (!token) return null;
      
      const response = await axios.get(`${API_URL}/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('🔐 Account API response:', {
        status: response.status,
        data: response.data?.user // Log full user data
      });
      
      // Ensure location exists in response
      if (!response.data?.user?.location) {
        console.warn('Location missing in account response');
      }
      
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

          if (userAddress && businessAddress) {
            const userLoc = await geocodeAddress(userAddress);
            const businessLoc = await geocodeAddress(businessAddress);

            setUserLocation(userLoc);
            setBusinessLocation(businessLoc);
          }
        }

        updateState({ accountData, loading: false });

        await Promise.all([fetchPolishes(), fetchPosts()]);
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
    } catch (error) {
      console.error("Follow error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      updateState({ followLoading: false });
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

  // Render functions
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

      <Text style={styles.postCaption}>{item.caption}</Text>

      <View style={styles.polishDetailsContainer}>
        <View style={[styles.colorCircle, { backgroundColor: polishLookup[item.polishId]?.hex || "#ccc" }]} />
        <TouchableOpacity onPress={() => handlePolishNamePress(item.polishId)}>
          <Text style={styles.postDetails}>
            {polishLookup[item.polishId]?.brand || "Brand"}: {polishLookup[item.polishId]?.name || "Polish Name"}
          </Text>
        </TouchableOpacity>
        <Text> | 📍 {item.nailLocation}</Text>
      </View>
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
    <View style={styles.container}>
      
      <View style={styles.headerContainer}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Account</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>@{state.user.username}</Text>
          <Text style={styles.userType}>
            {state.user.isBusiness ? "Business Account" : "Personal Account"}
          </Text>
          <Text>
  {distance !== null && distance !== undefined ? (distance * 0.621371).toFixed(2) : 'N/A'} miles
</Text>

        </View>
        

        <TouchableOpacity
          style={[
            styles.followButton,
            state.isFollowing && styles.followingButton
          ]}
          onPress={toggleFollow}
          disabled={state.followLoading}
        >
          {state.followLoading ? (
            <ActivityIndicator size="small" color={state.isFollowing ? "#555" : "#fff"} />
          ) : (
            <Text style={[
              styles.followButtonText,
              state.isFollowing && styles.followingButtonText
            ]}>
              {state.isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.followButtonsContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleViewFollowers}
          disabled={state.loading}
        >
          <Text style={styles.secondaryButtonText}>View Followers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleViewFollowing}
          disabled={state.loading}
        >
          <Text style={styles.secondaryButtonText}>View Following</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        {state.user.isBusiness ? "Business Posts" : "Posts"}
      </Text>

      {state.databasePosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={state.databasePosts}
          keyExtractor={(item) => item._id}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 20,
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
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
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
});

export default OtherAccountScreen;