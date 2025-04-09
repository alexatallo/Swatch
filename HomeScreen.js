import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SearchScreen from "./screens/SearchScreen";
import AccountScreen from "./screens/AccountScreen";
import ExploreFeedScreen from "./screens/ExploreFeedScreen";
import { Ionicons } from "@expo/vector-icons";
import ClientAccount from './screens/ClientAccount'; 
import BusinessAccount from './screens/BusinessAccount';

const Tab = createBottomTabNavigator();

const HomeScreen = ({ route }) => {
  const token = route.params?.token;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Search") iconName = "search";
          else if (route.name === "Explore") iconName = "compass";
          else if (route.name === "Account") iconName = "person";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // Set active and inactive colors
        tabBarActiveTintColor: '#6e3b6e',  // Set your desired active color
        tabBarInactiveTintColor: '#E0E0E0',  // Set your desired inactive color
      })}
    >
      <Tab.Screen name="Explore" component={ExploreFeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Account" component={AccountScreen} initialParams={{ token }} />
    </Tab.Navigator>
  );
};

export default HomeScreen;
