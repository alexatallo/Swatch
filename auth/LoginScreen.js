import React, { useState } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
const Storage = Platform.OS === 'web' ? localStorage : AsyncStorage;

export default function LoginScreen({ navigation }) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password) {
      Alert.alert("Error", "Please fill in both fields.");
      return;
    }

    setLoading(true); // Disable button during request

    try {
      const response = await axios.post(`${API_URL}/login`, {
        emailOrUsername: emailOrUsername.trim().toLowerCase(),
        password,
      });

      console.log("Server Response:", response.data);

      if (response.data.token) {
        await Storage.setItem("token", response.data.token); // Store token securely
        Alert.alert("Success", "Logged in successfully!");
        navigation.replace("Home");
      } else {
        Alert.alert("Error", "No token received from server.");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.error || "Network error. Please try again.");
    } finally {
      setLoading(false); // Re-enable button
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Login</Text>
      
      <TextInput
        label="Email or Username"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        mode="outlined"
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleLogin} disabled={loading} style={styles.button}>
        {loading ? "Logging in..." : "Login"}
      </Button>
      
      <Button mode="text" onPress={() => navigation.navigate("SignUp")} disabled={loading}>
        Create an Account
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { textAlign: "center", marginBottom: 20, fontWeight: "bold" },
  input: { marginBottom: 12 },
  button: { marginTop: 10 },
});