import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import SignUpScreen from "./auth/SignUpScreen";
import LoginScreen from "./auth/LoginScreen";
import DashboardScreen from "./auth/DashBoardScreen";
import HomeScreen from "./HomeScreen"; 
import PolishScreen from "./PolishScreen";
import CollectionScreen from "./screens/CollectionScreen"; 
import ClientAccount from "./screens/ClientAccount";
import BusinessAccount from "./screens/BusinessAccount";
import InventoryScreen from "./screens/InventoryScreen";
import SearchUserScreen from "./screens/SearchUserScreen";
import OtherAccountScreen from "./screens/OtherAccountScreen";
import FollowerScreen from "./screens/FollowerScreen"; 
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PolishScreen" component={PolishScreen} />
        <Stack.Screen name="CollectionScreen" component={CollectionScreen} />
        <Stack.Screen name="ClientAccount" component={ClientAccount} />
        <Stack.Screen name="BusinessAccount" component={BusinessAccount} />
        <Stack.Screen name="InventoryScreen" component={InventoryScreen} />
        <Stack.Screen name="SearchUser" component={SearchUserScreen} />
        <Stack.Screen name="OtherAccount" component={OtherAccountScreen} />
        <Stack.Screen name="Followers" component={FollowerScreen} /> 
        </Stack.Navigator>
    </NavigationContainer>
  );
}



