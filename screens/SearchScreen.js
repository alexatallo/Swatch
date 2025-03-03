import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';  

const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('token'); // No need for `await`
  }
  return await AsyncStorage.getItem('token');
};

export default function SearchScreen() {
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const token = await getToken();
        console.log("Stored Token:", token);

        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }

        const response = await axios.get('http://35.50.71.204:5000/polishes', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('API Response:', response.data);

        if (response.data.brand) {
          setBrand(response.data.brand);
        } else {
          setBrand(null);
        }
      } catch (error) {
        console.error('Error fetching brand:', error);
        setBrand(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SEARCH SCREEN</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6200ea" />
      ) : brand ? (
        <Text style={styles.brandText}>Brand: {brand}</Text>
      ) : (
        <Text>No brand available</Text>
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
  brandText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
});