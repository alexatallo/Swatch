import { registerRootComponent } from "expo";
import { LogBox, Platform } from "react-native";
import App from "./App";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === "web") {
  global.AsyncStorage = {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
    removeItem: async (key) => localStorage.removeItem(key),
  };
}

registerRootComponent(App);