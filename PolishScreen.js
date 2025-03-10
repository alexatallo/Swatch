import React from "react";
import { 
  View, 
  Text, 
  Image, 
  Linking, 
  StyleSheet, 
  TouchableOpacity 
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function PolishScreen({ route }) {
  const { item } = route.params;
  const navigation = useNavigation(); // ✅ Hook for navigation

  return (
    <View style={styles.container}>
      {/* Back Button at the Top Left */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Nail Polish Image */}
      <Image source={{ uri: item.picture }} style={styles.image} />
      <Text style={styles.title}>{item.name || "No name available"}</Text>
      <Text style={styles.text}>Brand: {item.brand || "Unknown brand"}</Text>
      <Text style={styles.text}>Collection: {item.collection || "Unknown collection"}</Text>

      {/* Buy Button */}
      {item.link && (
        <TouchableOpacity 
          style={styles.buyButton} 
          onPress={() => Linking.openURL(item.link)}
        >
          <Text style={styles.buyButtonText}>Buy</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 40,  // Adjust if needed
    left: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: "#007BFF",
    fontWeight: "bold",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    marginBottom: 5,
  },
  buyButton: {
    marginTop: 20,
    backgroundColor: "purple",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
