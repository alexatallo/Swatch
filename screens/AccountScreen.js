import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";

export default function AccountScreen({ route }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = route.params?.token; // Ensure token is passed correctly

  useEffect(() => {
    // Log token to ensure it's being passed
    console.log("Token received:", token);

    if (!token) {
      console.log("No token found!");
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        console.log("Fetching user data...");
        const response = await fetch("http://35.50.71.204:5000/account", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        // Log the response data
        console.log("API Response:", data);

        if (response.ok) {
          console.log("User data:", data);
          setUser(data);
        } else {
          console.error("Failed to fetch user data:", data.error);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [token]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!user) {
    return <Text>No user data found.</Text>;
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontWeight: "bold" }}>ACCOUNT SCREEN</Text>
      <Text>Email: {user.email}</Text>
      <Text>Username: {user.username}</Text>
      <Text>Name: {user.firstname} {user.lastname}</Text>

      {/* Conditionally render business data if the user is linked to a business */}
      {user.isBusiness && user.business && (
        <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderRadius: 5, borderColor: '#ccc' }}>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>Business Details:</Text>
          <Text>Business Name: {user.business.businessName || "N/A"}</Text>
          <Text>Location: {user.business.businessLocation || "N/A"}</Text>
          <Text>Website: {user.business.website || "N/A"}</Text>
          {/* Add any other business-related data you'd like to display */}
        </View>
      )}
    </View>
  );
}