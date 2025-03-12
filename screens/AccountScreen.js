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
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/account`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!loading && user !== null) {
      if (user.isBusiness) {
        navigation.navigate("BusinessAccount");
      } else {
        navigation.navigate("ClientAccount");
      }
    }
  }, [user, loading, navigation]);

  if (loading) {
    return <ActivityIndicator size="large" color="#A020F0" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading user data...</Text>
    </View>
  );
};

export default AccountScreen;
