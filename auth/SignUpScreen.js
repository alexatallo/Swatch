import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  ScrollView
} from "react-native";
import { Text, TextInput, Button, Switch } from "react-native-paper";
import axios from "axios";
import { API_URL } from "@env";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Oops!", "Please enter a valid email address ✉️");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert("Hmm...", "Password must be 8+ chars with 1 uppercase, 1 number, and 1 special character 🔒");
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
      
      let response = await axios.post(`${API_URL}/signup`, userPayload);
      let userId = response.data.userId;

      if (isBusinessAccount) {
        const businessPayload = { userId, businessName, businessLocation, website };
        await axios.post(`${API_URL}/business/signup`, businessPayload);
      }

      Alert.alert("Yay!", "Account created! 🎉", [
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      Alert.alert(
        "Oops!", 
        error.response?.data?.error || "Something went wrong. Try again! 🌐"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Animatable.View
          animation="fadeInDown"
          duration={1000}
          style={styles.header}
        >
          <MaterialCommunityIcons
            name="account-plus"
            size={80}
            color="#6e3b6e"
          />
          <Text variant="headlineMedium" style={styles.title}>
            Join Us!
          </Text> 
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          duration={1000}
          style={styles.formContainer}
        >
          <TextInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" color="#6e3b6e" />}
            theme={inputTheme}
          />

          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" color="#6e3b6e" />}
            theme={inputTheme}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="email" color="#6e3b6e" />}
            theme={inputTheme}
          />

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account-circle" color="#6e3b6e" />}
            theme={inputTheme}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="lock" color="#6e3b6e" />}
            right={
              <TextInput.Icon
                icon={isPasswordVisible ? "eye-off" : "eye"}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                color="#6e3b6e"
              />
            }
            theme={inputTheme}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Business Account?</Text>
            <Switch 
              value={isBusinessAccount} 
              onValueChange={() => setIsBusinessAccount(!isBusinessAccount)}
              color="#6e3b6e"
            />
          </View>

          {isBusinessAccount && (
            <Animatable.View animation="fadeIn" duration={500}>
              <TextInput
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="store" color="#6e3b6e" />}
                theme={inputTheme}
              />

              <TextInput
                label="Business Location"
                value={businessLocation}
                onChangeText={setBusinessLocation}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="map-marker" color="#6e3b6e" />}
                theme={inputTheme}
              />

              <TextInput
                label="Website"
                value={website}
                onChangeText={setWebsite}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="web" color="#6e3b6e" />}
                theme={inputTheme}
              />
            </Animatable.View>
          )}

          <Button
            mode="contained"
            onPress={handleSignUp}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Sign Up
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate("Login")}
              labelStyle={{ color: "#6e3b6e" }}
            >
              Login
            </Button>
          </View>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputTheme = {
  colors: { 
    primary: "#6e3b6e", 
    placeholder: "#9d5c9d", 
    text: "#333",
    background: "transparent",
  },
  roundness: 12,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingBottom: 40, // Extra padding at bottom
  },
  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  title: {
    color: "#6e3b6e",
    fontWeight: "bold",
    marginTop: 10,
    fontSize: 24,
  },
  subtitle: {
    color: "#9d5c9d",
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "white",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  switchLabel: {
    color: "#333",
  },
  button: {
    marginTop: 10,
    backgroundColor: "#6e3b6e",
    paddingVertical: 8,
    borderRadius: 12,
  },
  buttonLabel: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  footerText: {
    color: "#666",
  },
});