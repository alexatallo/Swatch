import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  Dimensions,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ColorPicker, fromHsv } from "react-native-color-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import Slider from "@react-native-community/slider"; 
const { width, height } = Dimensions.get("window"); // Get screen dimensions
const colorPickerSize = Platform.OS === "web" ? Math.min(width * 0.4, 250) : width * 0.8;

// Convert HEX to RGB
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

// Calculate color distance
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

  const findSimilarColors = (targetHex, polishList, N = 15) => {
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

    const filtered = findSimilarColors(selectedColor, polishData, 15);
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
        numColumns={2}
        columnWrapperStyle={styles.row}
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
 <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
      {/* Color Picker Modal */}
      <Modal
  transparent={true}
  visible={showColorPicker}
  animationType="slide"
  onRequestClose={() => setShowColorPicker(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Select a Color</Text>

      {/* Centered Color Picker */}
      <View style={[styles.colorPickerWrapper, { width: colorPickerSize, height: colorPickerSize }]}>
        {/* Web-specific wrapper to fix alignment */}
        <View style={Platform.OS === "web" ? styles.webColorPickerFix : null}>
          <ColorPicker
            onColorChange={(color) => setSelectedColor(fromHsv(color))}
            sliderComponent={Slider}
            style={[
              styles.colorPicker,
              { width: colorPickerSize, height: colorPickerSize },
            ]}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalButton} onPress={() => setShowColorPicker(false)}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: "#5D3FD3" }]}
          onPress={() => setShowColorPicker(false)}
        >
          <Text style={[styles.buttonText, { color: "#fff" }]}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#FFFFFF" },
  button: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedColorContainer: { flexDirection: "row", alignItems: "center", marginVertical: 15, backgroundColor: "#F3F3F3", padding: 10, borderRadius: 10 },
  colorPreview: { width: 40, height: 40, borderRadius: 20, marginLeft: 10, borderWidth: 1, borderColor: "#ccc" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  itemContainer: { flex: 1, alignItems: "center", backgroundColor: "#F9F9F9", borderRadius: 12, padding: 15, marginHorizontal: 5, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  image: { width: 100, height: 100, borderRadius: 10 },
  nameText: { fontSize: 16, fontWeight: "bold", color: "#333", marginTop: 5 },
  brandText: { fontSize: 14, color: "#777" },
  label: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 5 },
  confirmButton: { backgroundColor: "#5D3FD3", padding: 12, borderRadius: 8, flex: 1, marginRight: 5 },
  closeButton: { backgroundColor: "#5D3FD3", padding: 12, borderRadius: 8, flex: 1 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: Platform.OS === "web" ? "35%" : "90%",
    maxHeight: height * 0.7, // 🔥 Increased height
    minWidth: 300,
    justifyContent: "flex-start",
    paddingBottom: 0
     // 🔥 Aligns everything properly
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10, // 🔥 Reduced margin to move it up
  },
  
  colorPickerWrapper: {
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 280,
    maxHeight: 280,
    marginTop: 40, // 🔥 Added space above the picker
  },
  
  modalButtons: {
    flexDirection: "row",
    marginTop: 40, // 🔥 Push buttons lower
  },
  
  colorPicker: {
    alignSelf: "center", // Ensures it's centered inside wrapper
  },
  webColorPickerFix: {
    position: "relative",
    left: 5, // Adjust this value to center the hue ring on web
  },

  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
    backgroundColor: "#ddd",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
