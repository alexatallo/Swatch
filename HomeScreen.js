import React from "react";
import { View, Text, Button } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ padding: 20, alignItems: "center", justifyContent: "center", flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>🏠 Home Page</Text>
      <Button title="Logout" onPress={() => navigation.navigate("Login")} />
    </View>
    
  );
  console.log("Rendering HomeScreen");
}
