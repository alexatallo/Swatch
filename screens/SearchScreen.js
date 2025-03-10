import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import ColorPicker from "react-native-wheel-color-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";

const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((char) => char + char).join("");
  }
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
};

const colorDistance = (rgb1, rgb2) => {
  return Math.sqrt(
    (rgb1[0] - rgb2[0]) ** 2 +
    (rgb1[1] - rgb2[1]) ** 2 +
    (rgb1[2] - rgb2[2]) ** 2
  );
};

export default function SearchScreen({ navigation }) {
  const [polishData, setPolishData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState("");

  // FlatList ref for scrolling
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchPolishes = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("Token is missing.");
          setLoading(false);
          return;
        }

        console.log("📡 Fetching polishes...");
        const response = await axios.get(`${API_URL}/polishes`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (response.data && Array.isArray(response.data.data)) {
          setPolishData(response.data.data);
          setFilteredData(response.data.data);
        } else {
          console.error("Unexpected response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolishes();
  }, [navigation]);
  
  const findSimilarColors = (targetHex, polishList, N = 100) => {
    const targetRgb = hexToRgb(targetHex);
  
    const distances = polishList
      .filter((item) => item.hex) // Ensure polish has a hex code
      .map((item) => ({
        ...item,
        distance: colorDistance(targetRgb, hexToRgb(item.hex)),
      }))
      .sort((a, b) => a.distance - b.distance); // Sort from closest to farthest
  
    return distances.slice(0, N); // Return the top N closest matches
  };
  
  const filterByColor = () => {
    if (!selectedColor) {
      setFilteredData(polishData);
      return;
    }
  
    const filtered = findSimilarColors(selectedColor, polishData, 15); // Adjust N for stricter matching
    setFilteredData(filtered);
  
    // Scroll to top after filtering
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };
  
  
  

  if (loading) {
    return <ActivityIndicator size="large" color="#5D3FD3" />;
  }

  return (
    <View style={styles.container}>
      {/* Color Picker Button */}
      <TouchableOpacity style={styles.button} onPress={() => setShowColorPicker(true)}>
        <Text style={styles.buttonText}>Pick a Color</Text>
      </TouchableOpacity>

      {/* Show Selected Color */}
      {selectedColor ? (
        <View style={styles.selectedColorContainer}>
          <Text style={styles.label}>Selected Color:</Text>
          <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
        </View>
      ) : null}

      {/* Filter Button */}
      <TouchableOpacity style={styles.button} onPress={filterByColor}>
        <Text style={styles.buttonText}>Filter</Text>
      </TouchableOpacity>

      {/* Polish List */}
      <FlatList
        ref={flatListRef}
        data={filteredData}
        keyExtractor={(item, index) => (item._id ? item._id.toString() : index.toString())}
        numColumns={2} // Grid Layout: 2 items per row
        columnWrapperStyle={styles.row} // Fix row spacing
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => navigation.navigate("PolishScreen", { item })}
          >
            <Image source={{ uri: item.picture }} style={styles.image} />
            <Text style={styles.nameText}>{item.name || "No name"}</Text>
            <Text style={styles.brandText}>{item.brand || "Unknown brand"}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Select a Color:</Text>

            {/* Color Picker */}
            <ColorPicker
              onColorChange={setTempColor} // Store color in temp state
              style={{ height: 200, marginVertical: 10 }}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
            />

            {/* Confirm and Cancel Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setSelectedColor(tempColor); // Save the selected color
                  setShowColorPicker(false); // Close modal
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowColorPicker(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 15,
      backgroundColor: "#FFFFFF", // White background for a clean look
    },
    button: {
      backgroundColor: "#5D3FD3", // Dark Purple
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 15,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    buttonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 16,
      textTransform: "uppercase",
    },
    selectedColorContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 15,
      backgroundColor: "#F3F3F3",
      padding: 10,
      borderRadius: 10,
    },
    colorPreview: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginLeft: 10,
      borderWidth: 1,
      borderColor: "#ccc",
    },
    clearButton: {
      backgroundColor: "#5D3FD3", // Dark Purple
      padding: 8,
      borderRadius: 5,
      marginLeft: 10,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    itemContainer: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "#F9F9F9", // Light gray for subtle contrast
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 5,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    image: {
      width: 100,
      height: 100,
      borderRadius: 10,
    },
    nameText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#333", // Dark text for readability
      marginTop: 5,
    },
    brandText: {
      fontSize: 14,
      color: "#777", // Slightly muted text
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "85%",
      backgroundColor: "#FFFFFF", // Keep modal white for consistency
      padding: 20,
      borderRadius: 12,
      alignItems: "center",
    },
    label: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333",
      marginBottom: 5,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 15,
    },
    confirmButton: {
      backgroundColor: "#5D3FD3", // Dark Purple
      padding: 12,
      borderRadius: 8,
      flex: 1,
      marginRight: 5,
    },
    closeButton: {
      backgroundColor: "#5D3FD3", // Dark Purple (to match theme)
      padding: 12,
      borderRadius: 8,
      flex: 1,
    },
  });
  