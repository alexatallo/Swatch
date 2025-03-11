import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

const AccountScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }

        console.log("📡 Fetching user data...");
        const response = await axios.get(`${API_URL}/account`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("📡 API Response:", response.data);

        // Access the user data from the response
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else {
          console.error("Unexpected response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Navigate once the user data is fetched and loading is complete
  useEffect(() => {
    if (!loading && user !== null) {
      if (user.isBusiness) {
        console.log("🚀 Navigating to Business Account Screen...");
        navigation.navigate("BusinessAccount");
      } else {
        console.log("🚀 Navigating to Client Account Screen...");
        navigation.navigate("ClientAccount");
      }
    }
  }, [user, loading, navigation]);

  // Loading indicator while waiting for data
  if (loading) {
    return <ActivityIndicator size="large" color="#A020F0" />;
  }

  // If no user data, show this text
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading user data...</Text>
    </View>
  );
};

export default AccountScreen;