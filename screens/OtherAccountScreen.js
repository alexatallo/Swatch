import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
 View, Text, Platform, ActivityIndicator, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl
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
 console.log("Route Params:", route.params);
 const { item } = route.params || {};
 const navigation = useNavigation();
 const [user, setUser] = useState(null);
 const [databasePosts, setDatabasePosts] = useState([]); // Store posts from API
 // Store locally added posts
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const isMounted = useRef(true); // Prevent state updates on unmounted component
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
      }
  
      const postsResponse = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (!isMounted.current) return;
  
      const userPosts = postsResponse.data?.data?.filter(post => post.username === route.params?.item?.username) || [];
      setDatabasePosts(userPosts);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params]);
  
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
  

 if (loading) {
   return (
     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
       <ActivityIndicator size="large" color="#A020F0" />
       <Text>Loading...</Text>
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
 
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>
        {route.params?.item?.username}
      </Text>
 
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>
        {user?.isBusiness ? "Business Posts" : "Posts"}
      </Text>
 
 
      {databasePosts.length === 0 ? (
        <Text>No posts yet.</Text>
      ) : (
        <FlatList
        style={styles.flatList}
          data={databasePosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
             <View style={styles.itemContainer}>
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
 }
 
 const styles = StyleSheet.create({
 headerContainer: {
       paddingHorizontal: 20,
       paddingBottom: 10,
     },
     backButton: {
       marginBottom: 10,
       padding: 10,
       alignSelf: "flex-start",
     },
     headerText: {
       fontSize: 26,
       fontWeight: "700",
       color: "#333",
       textAlign: "center",
       marginBottom: 20,
     },
     container: {
         flex: 1,
         backgroundColor: "#F8F8F8",
         paddingTop: Platform.OS === "web" ? 20 : 40,
         paddingHorizontal: Platform.OS === "web" ? 20 : 10,
         },
    flatList: {
          height: Platform.OS === 'web' ? '70vh' : undefined, // Fixed height for web
        }, 
        itemContainer: {
            alignItems: "center",
            paddingTop: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            borderRadius: 10,
            backgroundColor: "#f9f9f9",
            padding: 10,
            marginBottom: 20,  // Reduce this
            elevation: 5,
          },          
 });

export default OtherAccountScreen;