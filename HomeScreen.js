import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SearchScreen from "./screens/SearchScreen";
import AccountScreen from "./screens/AccountScreen";
import ExploreFeedScreen from "./screens/ExploreFeedScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

const HomeScreen = ({ route }) => {
  const token = route.params?.token;  // Get token from previous screen's params

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
      })}
    >
      <Tab.Screen name="Explore" component={ExploreFeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        initialParams={{ token }} 
      />
    </Tab.Navigator>
  );
};

export default HomeScreen;
