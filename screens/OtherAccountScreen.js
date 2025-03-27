import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Platform, ActivityIndicator, StyleSheet, FlatList, Image, 
  TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';

const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

const OtherAccountScreen = ({route}) => {
  const { item } = route.params || {};
  const navigation = useNavigation();
  const [hasMorePolishes, setHasMorePolishes] = useState(true);
  const [user, setUser] = useState(null);
  const [databasePosts, setDatabasePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [polishData, setPolishData] = useState([]);
  const isMounted = useRef(true);
    
      // 1. Memoized polish lookup
      const polishLookup = useMemo(() => {
        const lookup = {};
        polishData.forEach(polish => {
          if (polish?._id) {
            lookup[polish._id] = polish;
          }
        });
        return lookup;
      }, [polishData]);
    
      // 2. Fetch polishes - load once
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
    
      // 3. Fetch posts - can refresh
      const fetchPosts = useCallback(async () => {
        try {
          const token = await getToken();
          if (!token) {
            console.error("Token is missing.");
            setLoading(false);
            return;
          }
    
          if (route.params?.item) {
            setUser(route.params.item);
            await checkFollowingStatus();
          }
    
          const postsResponse = await axios.get(`${API_URL}/posts/user/${item._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
    
          if (!isMounted.current) return;
          setDatabasePosts(postsResponse.data?.data || []);
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      }, [route.params, checkFollowingStatus, item?._id]);
    
      // 4. Initial load - runs once on mount
      useEffect(() => {
        isMounted.current = true;
        const loadInitialData = async () => {
          setLoading(true);
          await fetchPolishes(); // Load polishes once
          await fetchPosts();    // Load initial posts
        };
        loadInitialData();
    
        return () => {
          isMounted.current = false;
        };
      }, []); // Empty dependency array = runs once
    
      // 5. Refresh posts when screen comes into focus
      useFocusEffect(
        useCallback(() => {
          if (isMounted.current) {
            fetchPosts(); // Only refresh posts, not polishes
          }
        }, [fetchPosts])
      );
    
      // 6. Render item with polish data
      const renderItem = ({item}) => (
        <View style={{ position: "relative", alignItems: "center" }}>
        {/* Post Card */}
        <View style={styles.postCard}>
    
          {/* Post Image */}
          <TouchableWithoutFeedback onPress={() => handleImagePress(item)}>
            {item.photoUri ? (
              <Image 
                source={{ uri: item.photoUri }} 
                style={styles.postImage} 
                resizeMode="cover"
              />
            ) : (
                <Text>No Image Available</Text>
            
            )}
          </TouchableWithoutFeedback>
    
          {/* Caption */}
          <Text style={styles.postCaption}>{item.caption}</Text>
    
          {/* Nail Polish Details */}
          <View style={styles.polishDetailsContainer}>
            {/* Color Circle */}
            <View
              style={[
                styles.colorCircle,
                { backgroundColor: polishLookup[item.polishId]?.hex || "#ccc" },
              ]}
            />
    
            {/* Nail Polish Name and Location */}
            <TouchableOpacity 
              onPress={() => handlePolishNamePress(item.polishId)}
              disabled={!polishLookup[item.polishId]}
            >
              <Text style={styles.postDetails}>
                {polishLookup[item.polishId]?.brand || "Brand"}: 
                {polishLookup[item.polishId]?.name || "Polish Name"}
              </Text>
            </TouchableOpacity>
    
            <Text> | 📍 {item.nailLocation}</Text>
          </View>
        </View>
      </View>
    );  
  
  const checkFollowingStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !item?._id) return;

      const response = await axios.get(`${API_URL}/users/is-following/${item._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (isMounted.current && response.data?.isFollowing !== undefined) {
        setIsFollowing(response.data.isFollowing);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  }, [item?._id]);

  const toggleFollow = async () => {
    if (!item?._id || followLoading) return;
  
    setFollowLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "You need to be logged in to follow users");
        return;
      }
  
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      await axios.post(
        `${API_URL}/users/${item._id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Follow error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleViewFollowers = () => {
    navigation.navigate("Followers", { userId: item._id });
  };


  const handlePolishNamePress = (polishId) => {
    
    const item = polishLookup[polishId];
    if (item) {
      navigation.navigate("PolishScreen", { item });
    } else {
      console.error("Polish not found:", polishId);
    }
  };

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
        <Text style={styles.headerText}>Account</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>@{item?.username}</Text>
          <Text style={styles.userType}>
            {user?.isBusiness ? "Business Account" : "Personal Account"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing ? styles.followingButton : styles.followButton
          ]}
          onPress={toggleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? "#555" : "#fff"} />
          ) : (
            <Text style={[
              styles.followButtonText,
              isFollowing ? styles.followingButtonText : null
            ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={[
            styles.followButton, 
            { 
              marginTop: 10, 
              backgroundColor: '#ccc',
              opacity: loadingFollowers ? 0.7 : 1
            }
          ]}
          onPress={handleViewFollowers}
          disabled={loadingFollowers}
        >
          {loadingFollowers ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <Text style={{ color: '#333', fontWeight: 'bold' }}>View Followers</Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
  style={[
    styles.followButton,
    { marginTop: 10, backgroundColor: '#ccc', opacity: loadingFollowers ? 0.7 : 1 }
  ]}
  onPress={() => navigation.navigate("Following", { userId: item._id })}
  disabled={loadingFollowers}
>
  {loadingFollowers ? (
    <ActivityIndicator size="small" color="#333" />
  ) : (
    <Text style={{ color: '#333', fontWeight: 'bold' }}>View Following</Text>
  )}
</TouchableOpacity>


      <Text style={styles.sectionTitle}>
        {user?.isBusiness ? "Business Posts" : "Posts"}
      </Text>

      {databasePosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet.</Text>
        </View>
      ) : (
        <FlatList
        style={styles.flatlist}
          data={databasePosts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPosts();
              }}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  flatlist: {
    height: Platform.OS == 'web' ? '70vh' : undefined,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
  },
  postContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
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
  caption: {
    fontSize: 16,
    marginBottom: 5,
  },
  polishText: {
    fontSize: 14,
    color: '#666',
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
  postCaption: {
    fontSize: 18, // Larger font size
    fontWeight: "bold",
    marginBottom: 10,
  },
  postCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    width: "90%",
    alignSelf: "center",
    borderWidth: 1, // Adds a border
    borderColor: "#ccc", // Light gray border color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});

export default OtherAccountScreen;