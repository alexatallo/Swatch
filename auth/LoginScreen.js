import React, { useState } from "react";

import { View, StyleSheet, Alert, Platform, KeyboardAvoidingView, TouchableOpacity } from "react-native";

import { Text, TextInput, Button } from "react-native-paper";

import axios from "axios";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_URL } from "@env";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import * as Animatable from "react-native-animatable";



const Storage = Platform.OS === "web" ? localStorage : AsyncStorage;



export default function LoginScreen({ navigation }) {

 const [emailOrUsername, setEmailOrUsername] = useState("");

 const [password, setPassword] = useState("");

 const [loading, setLoading] = useState(false);

 const [isPasswordVisible, setIsPasswordVisible] = useState(false);



 const handleLogin = async () => {

   if (!emailOrUsername.trim() || !password) {

     Alert.alert("Please fill in both fields");

     return;

   }



   setLoading(true);



   try {

     const response = await axios.post(`${API_URL}/login`, {

       emailOrUsername: emailOrUsername.trim().toLowerCase(),

       password,

     });



     if (response.data.token) {

       await Storage.setItem("token", response.data.token);

       Alert.alert("Yay!", "Logged in successfully!", [

         { text: "OK", onPress: () => navigation.replace("Home") },

       ]);

     } else {

       Alert.alert("No token received from server.");

     }

   } catch (error) {

     Alert.alert(

       "Error",

       error.response?.data?.error || "Network error. Please try again."

     );

   } finally {

     setLoading(false);

   }

 };



 return (

   <View style={styles.container}>

     <KeyboardAvoidingView

       behavior={Platform.OS === "ios" ? "padding" : "height"}

       style={styles.content}

     >

       <Animatable.View

         animation="fadeInDown"

         duration={1000}

         style={styles.header}

       >

         <MaterialCommunityIcons

           name="account-circle"

           size={80}

           color="#6e3b6e"

         />

         <Text variant="headlineMedium" style={styles.title}>

           Welcome Back!

         </Text>

       </Animatable.View>



       <Animatable.View

         animation="fadeInUp"

         duration={1000}

         style={styles.formContainer}

       >

         <TextInput

           label="Email or Username"

           value={emailOrUsername}

           onChangeText={setEmailOrUsername}

           mode="outlined"

           style={styles.input}

           autoCapitalize="none"

           left={<TextInput.Icon icon="email" color="#6e3b6e" />}

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



         <Button

           mode="contained"

           onPress={handleLogin}

           disabled={loading}

           loading={loading}

           style={styles.button}

           labelStyle={styles.buttonLabel}

         >

           {loading ? "One sec..." : "Login"}

         </Button>



         <View style={styles.footer}>

           <Text style={styles.footerText}>Don't have an account?</Text>

           <Button

             mode="text"

             onPress={() => navigation.navigate("SignUp")}

             labelStyle={{ color: "#6e3b6e" }}

           >

             Sign Up

           </Button>

         </View>

       </Animatable.View>

     </KeyboardAvoidingView>

   </View>

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

 content: {

   flex: 1,

   paddingHorizontal: 25,

   justifyContent: "center",

 },

 header: {

   alignItems: "center",

   marginBottom: 30,

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

 },

 input: {

   marginBottom: 15,

   backgroundColor: "white",

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