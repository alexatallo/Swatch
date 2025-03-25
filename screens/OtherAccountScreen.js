import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Platform, ActivityIndicator, StyleSheet, FlatList, Image, 
  TouchableOpacity, RefreshControl, Alert
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
  const [user, setUser] = useState(null);
  const [databasePosts, setDatabasePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const isMounted = useRef(true);

  // Check follow status when component mounts or user changes
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

  const fetchData = useCallback(async () => {
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

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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

      <Text style={styles.sectionTitle}>
        {user?.isBusiness ? "Business Posts" : "Posts"}
      </Text>

      {databasePosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={databasePosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              {item.photoUri && (
                <Image 
                  source={{ uri: item.photoUri }} 
                  style={styles.postImage} 
                />
              )}
              <Text style={styles.caption}>{item.caption}</Text>
              {item.polishId && (
                <Text style={styles.polishText}>
                  Polish: {item.polishName || 'Unknown polish'}
                </Text>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
              tintColor="#A020F0"
            />
          }
        />
      )}
    </View>
  );
}

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
});

export default OtherAccountScreen;