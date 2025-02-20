import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import axios from "axios";

export default function LoginScreen({ navigation }) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
        const response = await axios.post("http://35.50.90.208:5000/login", { 
            emailOrUsername: emailOrUsername.toLowerCase(), 
            password 
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
    <View style={{ padding: 20 }}>
      <Text>Login</Text>
      <TextInput 
        placeholder="Email or Username" 
        value={emailOrUsername} 
        onChangeText={setEmailOrUsername} 
        style={{ borderWidth: 1, marginBottom: 10 }} 
      />
      <TextInput 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        style={{ borderWidth: 1, marginBottom: 10 }} 
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Create an Account" onPress={() => navigation.navigate("SignUp")} />
    </View>
  );
}
