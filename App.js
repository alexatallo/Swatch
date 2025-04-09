import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity } from 'react-native';
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs();
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const CustomBackButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
    <Ionicons name="arrow-back" size={24} color="#000" /> {/* Custom back arrow icon */}
  </TouchableOpacity>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6e3b6e',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
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

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: '#000', }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerLeft: null }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
        <Stack.Screen name="PolishScreen" options={{ title: 'Polish Details', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={PolishScreen} />
        <Stack.Screen name="CollectionScreen" options={{ title: 'Collections', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} />}}component={CollectionScreen} />
        <Stack.Screen name="ClientAccount" options={{ title: 'Settings', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={ClientAccount} />
        <Stack.Screen name="BusinessAccount" options={{ title: 'Settings', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} />}}component={BusinessAccount} />
        <Stack.Screen name="InventoryScreen"  options={{ title: 'Inventory', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={InventoryScreen} />
        <Stack.Screen name="SearchUser" options={{ title: 'Find Users' }}component={SearchUserScreen} />
        <Stack.Screen name="OtherAccount" options={{ title: 'Find Users', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={OtherAccountScreen} />
        <Stack.Screen name="Followers" options={{ title: 'Followers', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={FollowerScreen} /> 
        <Stack.Screen name="Following" options={{ title: 'Following', headerLeft: ({ onPress }) => <CustomBackButton onPress={onPress} /> }}component={FollowingScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}