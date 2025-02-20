import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import axios from "axios";

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false); // Toggle for business fields
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [website, setWebsite] = useState("");

  const handleSignUp = async () => {
    // Ensure Email Format 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
    }

    // Ensure Address is correct formate
    const addressRegex = /^[0-9]+\s[A-Za-z0-9\s,.-]+$/;
    if (isBusinessAccount && !addressRegex.test(businessLocation)) {
        Alert.alert("Invalid Address", "Please enter a valid business address.");
        return;
    }

    // Ensure website is correct formate
    const websiteRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (isBusinessAccount && !websiteRegex.test(website)) {
        Alert.alert("Invalid Website", "Please enter a valid website URL (must start with http:// or https://).");
        return;
    }

    // Password Requirments: 8 characters, one Uppercase, One lowercase, one number, one speical character 
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        Alert.alert("Weak Password", "Password must be at least 8 characters, include one uppercase letter, one lowercase letter, one number, and one special character.");
        return;
    }

    try {
        const userPayload = {
            email, 
            password, 
            username, 
            firstname: firstName, 
            lastname: lastName, 
            isBusiness: isBusinessAccount
        };

        // IP ADDRESS REQUIRED
        let response = await axios.post("http://198.x.x.x.x:5000/signup", userPayload);
        let userId = response.data.userId;

        if (isBusinessAccount) {
            const businessPayload = {
                userId,
                businessName,
                businessLocation,
                website
            };
            // IP ADDRESS REQUIRED 
            await axios.post("http://http://198.x.x.x.x:5000/business/signup", businessPayload);
        }

        Alert.alert("Success", "Account created!");
        navigation.navigate("Login");
    } catch (error) {
        console.error("Signup Error:", error.response?.data || error.message);
        Alert.alert("Error", error.response?.data?.error || "Something went wrong");
    }
};



  return (
    <View style={{ padding: 20 }}>
      <Text>Sign Up</Text>

      <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10 }} />

      {/* Business Button */}
      <Button title="Business Account?" onPress={() => setIsBusinessAccount(!isBusinessAccount)} />

      {/* Extra feild for Business */}
      {isBusinessAccount && (
        <>
          <TextInput placeholder="Business Name" value={businessName} onChangeText={setBusinessName} style={{ borderWidth: 1, marginBottom: 10 }} />
          <TextInput placeholder="Business Location" value={businessLocation} onChangeText={setBusinessLocation} style={{ borderWidth: 1, marginBottom: 10 }} />
          <TextInput placeholder="Website" value={website} onChangeText={setWebsite} style={{ borderWidth: 1, marginBottom: 10 }} />
        </>
      )}

      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
}
