import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import axios from "axios";

export default function DashboardScreen({ route, navigation }) {
  const { token } = route.params;
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
      // IP ADDRESS REQUIREd
        const response = await axios.get("http://35.50.84.107:5000/login", {
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