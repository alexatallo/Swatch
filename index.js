import { registerRootComponent } from "expo";
import App from "./App";
import { LogBox } from "react-native";


// Ignore all logs when need to record or something 
// LogBox.ignoreAllLogs(true);


// Register the main application component
registerRootComponent(App);


