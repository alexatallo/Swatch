import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import axios from "axios";
import { API_URL } from "@env"; 

export default function DashboardScreen({ route, navigation }) {
  const { token } = route.params;
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
      // IP ADDRESS REQUIREd
        const response = await axios.get(`${API_URL}/login`, {
          headers: { Authorization: token },
        });
        setUser(response.data.user);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch user data");
        navigation.navigate("Login");
      }
    };
    fetchUserData();
  }, []);
  
  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome, {user?.email || "Loading..."}</Text>
      <Button title="Logout" onPress={() => navigation.navigate("Login")} />
    </View>
  );
}