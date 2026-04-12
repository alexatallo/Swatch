import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, TouchableOpacity, ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
import FollowingScreen from "./screens/FollowingScreen";
import AccountScreen from "./screens/AccountScreen";
import ExploreFeedScreen from "./screens/ExploreFeedScreen";
import SearchScreen from "./screens/SearchScreen";

function CustomBackButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", padding: 10 }}
    >
      <Ionicons name="arrow-back" size={24} color="#000" />
    </TouchableOpacity>
  );
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Explore") iconName = focused ? "compass" : "compass-outline";
          else if (route.name === "Search") iconName = focused ? "search" : "search-outline";
          else if (route.name === "Account") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6e3b6e",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 12, marginBottom: Platform.OS === "ios" ? 0 : 5 },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Explore" component={ExploreFeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack
function AuthStack({ onLogin }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: "#000" }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

// App Stack
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: "#000" }}>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PolishScreen"
        component={PolishScreen}
        options={{ title: "Polish Details", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="CollectionScreen"
        component={CollectionScreen}
        options={{ title: "Collections", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="ClientAccount"
        component={ClientAccount}
        options={{ title: "Settings", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="BusinessAccount"
        component={BusinessAccount}
        options={{ title: "Settings", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="InventoryScreen"
        component={InventoryScreen}
        options={{ title: "Inventory", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen name="SearchUser" component={SearchUserScreen} options={{ title: "Find Users" }} />
      <Stack.Screen
        name="OtherAccount"
        component={OtherAccountScreen}
        options={{ title: "Find Users", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="Followers"
        component={FollowerScreen}
        options={{ title: "Followers", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
      <Stack.Screen
        name="Following"
        component={FollowingScreen}
        options={{ title: "Following", headerLeft: (props) => <CustomBackButton {...props} /> }}
      />
    </Stack.Navigator>
  );
}

// Main App
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setUserToken(token);
      } catch (e) {
        console.error("Failed to restore token:", e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const handleLogin = async (token) => {
    await AsyncStorage.setItem("token", token);
    setUserToken(token);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6e3b6e" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken == null ? <AuthStack onLogin={handleLogin} /> : <AppStack />}
    </NavigationContainer>
  );
}