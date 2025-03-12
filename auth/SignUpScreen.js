import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, TextInput, Button, Switch } from "react-native-paper";
import axios from "axios";
import { API_URL } from "@env";

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [website, setWebsite] = useState("");

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert("Weak Password", "Password must be at least 8 characters, include one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }

    try {
      const userPayload = { email, password, username, firstname: firstName, lastname: lastName, isBusiness: isBusinessAccount };
      let response = await axios.post(`${API_URL}/signup`, userPayload);
      let userId = response.data.userId;

      if (isBusinessAccount) {
        const businessPayload = { userId, businessName, businessLocation, website };
        await axios.post(`${API_URL}/business/signup`, businessPayload);
      }

      Alert.alert("Success", "Account created!");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Signup Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Sign Up</Text>

      <TextInput label="First Name" value={firstName} onChangeText={setFirstName} mode="outlined" style={styles.input} />
      <TextInput label="Last Name" value={lastName} onChangeText={setLastName} mode="outlined" style={styles.input} />
      <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} />
      <TextInput label="Username" value={username} onChangeText={setUsername} mode="outlined" style={styles.input} />
      <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.input} />

      <View style={styles.switchContainer}>
        <Text>Business Account?</Text>
        <Switch value={isBusinessAccount} onValueChange={() => setIsBusinessAccount(!isBusinessAccount)} />
      </View>

      {isBusinessAccount && (
        <>
          <TextInput label="Business Name" value={businessName} onChangeText={setBusinessName} mode="outlined" style={styles.input} />
          <TextInput label="Business Location" value={businessLocation} onChangeText={setBusinessLocation} mode="outlined" style={styles.input} />
          <TextInput label="Website" value={website} onChangeText={setWebsite} mode="outlined" style={styles.input} />
        </>
      )}

      <Button mode="contained" onPress={handleSignUp} style={styles.button}>
        Sign Up
      </Button>

      <Button mode="text" onPress={() => navigation.navigate("Login")}>
        Already have an account? Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { textAlign: "center", marginBottom: 20, fontWeight: "bold" },
  input: { marginBottom: 12 },
  button: { marginTop: 10 },
  switchContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
});