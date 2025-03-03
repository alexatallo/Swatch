
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, Alert, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('token'); // No need for `await`
  }
  return await AsyncStorage.getItem('token');
};


export default function SearchScreen() {
  const [imageURL, setImageURL] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchPicture = async () => {
      try {
        const token = await getToken();
        console.log("Stored Token:", token);


        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }


        // Fetch the Polish collection
        const response = await axios.get('http://35.50.71.204:5000/polishes', {
          headers: { Authorization: `Bearer ${token}` },
        });


        console.log('API Response:', response.data);


        // Assuming response.data.picture contains the URL of the image
        if (response.data.picture) {
          setImageURL(response.data.picture); // Set the image URL
        } else {
          setImageURL(null);
        }
      } catch (error) {
        console.error('Error fetching picture:', error);
        setImageURL(null);
      } finally {
        setLoading(false);
      }
    };


    fetchPicture();
  }, []);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>SEARCH SCREEN</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6200ea" />
      ) : imageURL ? (
        <Image source={{ uri: imageURL }} style={styles.image} /> // Display the image from the URL
      ) : (
        <Text>No image available</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
    marginTop: 20,
  },
});
