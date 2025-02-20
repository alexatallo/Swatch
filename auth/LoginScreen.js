import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import axios from "axios";

export default function LoginScreen({ navigation }) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert("Error", "Please fill in both fields.");
      return;
    }

    try {
      const response = await axios.post("http://35.50.x.x:5000/login", {
        emailOrUsername: emailOrUsername.toLowerCase(),
        password,
      });

      console.log("Server Response:", response.data);

      if (response.data.token) {
        Alert.alert("Success", "Logged in successfully!");
        navigation.replace("Home", { token: response.data.token });
      } else {
        Alert.alert("Error", "No token received from server.");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.error || "Something went wrong");
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
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleLogin} style={styles.button}>
        Login
      </Button>
      
      <Button mode="text" onPress={() => navigation.navigate("SignUp")}>
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