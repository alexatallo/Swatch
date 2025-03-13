import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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

  const handleSettingsPress = () => {
    if (!loading && user) {
      if (user.isBusiness) {
        console.log("🚀 Navigating to Business Account Screen...");
        navigation.navigate("BusinessAccount");
      } else {
        console.log("🚀 Navigating to Client Account Screen...");
        navigation.navigate("ClientAccount");
      }
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#A020F0" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity 
        style={{ position: 'absolute', top: 50, right: 20 }} 
        onPress={handleSettingsPress}
      >
        <Ionicons name="settings-outline" size={28} color="black" />
      </TouchableOpacity>
      <Text>Welcome to your account!</Text>
      {user && (
        <Text style={{ marginTop: 10, fontSize: 18 }}>
          {user.isBusiness ? "Business Account" : "Client Account"}
        </Text>
      )}
    </View>
  );
};

export default AccountScreen;