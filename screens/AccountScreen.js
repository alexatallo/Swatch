import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
 View, Text, ActivityIndicator, FlatList, Image, TouchableOpacity, RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@env';


const getToken = async () => {
 return await AsyncStorage.getItem("token");
};


const LOCAL_POSTS_KEY = "user_posts"; // Local storage key


const AccountScreen = () => {
 const navigation = useNavigation();
 const [user, setUser] = useState(null);
 const [databasePosts, setDatabasePosts] = useState([]); // Store posts from API
 const [localPosts, setLocalPosts] = useState([]); // Store locally added posts
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const isMounted = useRef(true); // Prevent state updates on unmounted component
 const [settingButtonVisible, setSettingButtonVisible] = useState(true);
 
 // Memoized merged posts (local + database) to prevent unnecessary re-renders
 const mergedPosts = useMemo(() => {
   const allPosts = [...localPosts, ...databasePosts];


   // Remove duplicates based on post ID
   const uniquePosts = allPosts.reduce((acc, post) => {
     if (!acc.find(p => p._id === post._id)) {
       acc.push(post);
     }
     return acc;
   }, []);


   return uniquePosts;
 }, [localPosts, databasePosts]);


 // Load user data and posts
 const loadUserData = async () => {
   try {
     const token = await getToken();
     if (!token) {
       console.error("Token is missing.");
       setLoading(false);
       return;
     }


     console.log("📡 Fetching user data and posts...");
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
     } else {
       console.error("Unexpected response format:", userResponse.data);
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


 // Load posts from AsyncStorage (local storage)
 const loadLocalPosts = async () => {
   try {
     const localPostsJSON = await AsyncStorage.getItem(LOCAL_POSTS_KEY);
     const storedPosts = localPostsJSON ? JSON.parse(localPostsJSON) : [];
     setLocalPosts(storedPosts);
   } catch (error) {
     console.error("Error loading local posts:", error);
   }
 };


 // Debounce refresh function to prevent multiple calls
 const debounce = (func, delay) => {
   let timeoutId;
   return (...args) => {
     clearTimeout(timeoutId);
     timeoutId = setTimeout(() => func(...args), delay);
   };
 };


 const handleRefresh = debounce(async () => {
   setRefreshing(true);
   await loadUserData();
 }, 300);


 // Auto-refresh when navigating to AccountScreen
 useFocusEffect(
   useCallback(() => {
     isMounted.current = true;
     loadUserData();
     loadLocalPosts();
     return () => {
       isMounted.current = false; // Prevent memory leaks
     };
   }, [])
 );


 if (loading) {
   return (
     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
       <ActivityIndicator size="large" color="#A020F0" />
       <Text>Loading...</Text>
     </View>
   );
 }


 return (
   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 }}>
     <TouchableOpacity
       visible={settingButtonVisible}
       style={{ position: 'absolute', top: 50, right: 20 }}
       onPress={() => {
         if (user?.isBusiness) {
           navigation.navigate("BusinessAccount");
         } else {
           navigation.navigate("ClientAccount");
         }
       }}
     >
       <Ionicons name="
       s-outline" size={28} color="black" />
     </TouchableOpacity>

     <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>
       {user.username}
     </Text>

     <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>
       {user?.isBusiness ? "Business Posts" : "Posts"}
     </Text>


     {mergedPosts.length === 0 ? (
       <Text>No posts yet.</Text>
     ) : (
       <FlatList
         data={mergedPosts}
         keyExtractor={(item) => item._id}
         refreshControl={
           <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
         }
         renderItem={({ item }) => (
           <View style={{ marginBottom: 20, alignItems: "center", backgroundColor: "#f9f9f9", padding: 10, borderRadius: 10 }}>
             {item.photoUri && (
               <Image source={{ uri: item.photoUri }} style={{ width: 200, height: 200, borderRadius: 10 }} />
             )}
             <Text style={{ fontWeight: "bold", marginTop: 10 }}>{item.caption}</Text>
           </View>
         )}
       />
     )}
   </View>
 );
};


export default AccountScreen;

