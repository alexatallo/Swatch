import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// Dummy Screens
function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Explore Screen</Text>
    </View>
  );
}

function SearchScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Search Screen</Text>
    </View>
  );
}

function AccountScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Account Screen</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Explore") iconName = "explore";
            else if (route.name === "Search") iconName = "search";
            else if (route.name === "Account") iconName = "person";
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Explore" component={ExploreScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
  );
}
