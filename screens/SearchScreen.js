import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
  Text,
  Image,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ColorPicker, fromHsv } from "react-native-color-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from 'expo-file-system';
import ImageColors from "react-native-image-colors";


const { width, height } = Dimensions.get("window");
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


const colorDistance = (rgb1, rgb2) => {
  return Math.sqrt(
    (rgb1[0] - rgb2[0]) ** 2 + (rgb1[1] - rgb2[1]) ** 2 + (rgb1[2] - rgb2[2]) ** 2
  );
};


export default function SearchScreen({ navigation, route }) {
  const [polishData, setPolishData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [pickedColor, setPickedColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showColorExtractor, setShowColorExtractor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");


  //color extractor tools
  const [image, setImage] = useState(null); // Store selected image URI
  const [imageSize, setImageSize] = useState(null); // Store original image size
  const [displaySize, setDisplaySize] = useState({ width: 300, height: 300 }); // Displayed image size
  const [tapLocation, setTapLocation] = useState(null); // Store tap coordinates
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);


  const flatListRef = useRef(null);


  useEffect(() => {
    console.log("Picked Color Updated:", pickedColor);
  }, [pickedColor]);
  
  // Request permissions
  useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);


  // Pick image from gallery
  const openImagePicker = async () => {
    if (!hasMediaLibraryPermission) {
      alert("Permission to access media library is required.");
      return;
    }


    let result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });


    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setTapLocation(null);
      setPickedColor(null);


      // Get the original size of the image
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { base64: false });
      setImageSize({ width: imageInfo.width, height: imageInfo.height });
    }
  };
 


  // Open camera
  const openCamera = async () => {
    if (!hasCameraPermission) {
      alert("Permission to access the camera is required.");
      return;
    }


    let result = await ImagePicker.launchCameraAsync({ quality: 1 });


    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setTapLocation(null);
      setPickedColor(null);


      // Get the original size of the image
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { base64: false });
      setImageSize({ width: imageInfo.width, height: imageInfo.height });
    }
  };
  const handleImageTap = async (event) => {
    if (!image || !imageSize) return;
  
    const { locationX, locationY } = event.nativeEvent;
  
    const actualX = Math.round((locationX / displaySize.width) * imageSize.width);
    const actualY = Math.round((locationY / displaySize.height) * imageSize.height);
  
    setTapLocation({ x: actualX, y: actualY });
  
    console.log(`Tapped at: X=${actualX}, Y=${actualY}`);
  
    try {
      const croppedImage = await ImageManipulator.manipulateAsync(
        `${image}?t=${Date.now()}`, // Prevents caching
        [{ crop: { originX: actualX, originY: actualY, width: 1, height: 1 } }],
        { format: ImageManipulator.SaveFormat.PNG, base64: true }
      );
  
      console.log("Cropped Image URI:", croppedImage.uri);
  
      // Extract color properly
      const colors = await ImageColors.getColors(croppedImage.uri, {
        fallback: "#FFFFFF",
      });
  
      const hexColor = colors.dominant || colors.primary;
      console.log("Extracted Hex:", hexColor);
  
      setPickedColor((prevColor) => (prevColor === hexColor ? hexColor + " " : hexColor));
    } catch (error) {
      console.error("Error extracting color:", error);
    }
  };
  
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
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
      .sort((a, b) => a.distance - b.distance);
    return distances.slice(0, N);
  };


  const clearFilters = () => {
    setSearchQuery("");
    setSelectedColor("");
    setFilteredData(polishData);
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };


  //applyfilters
  const applyFilters = useCallback(
    (color = selectedColor, search = searchQuery) => {
      // If no color and no search, show full list
      if (!color && !search) {
        setFilteredData(polishData);
        return;
      }
      let filtered = polishData;
      if (color) {
        filtered = findSimilarColors(color, filtered, 15);
      }
      if (search) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      setFilteredData(filtered);
      flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
    },
    [selectedColor, searchQuery, polishData]
  );


  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(selectedColor, text); // Use the latest search input
  };


  if (loading) {
    return <ActivityIndicator size="large" color="#5D3FD3" />;
  }


  return (
    <View style={styles.container}>
      {/* Search Bar & Color Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search polish name..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.colorButton}
          onPress={() => setShowColorPicker(true)}
        >
          <Text style={styles.buttonText}>Color 🎨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.colorButton}
          onPress={() => setShowColorExtractor(true)}
        >
          <Text style={styles.buttonText}>Cam</Text>
        </TouchableOpacity>
      </View>


      {/* Clear Filters Button (Outside the search container) */}
      {(searchQuery || selectedColor) && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}


      {/* Polish List */}
      <FlatList
        ref={flatListRef}
        data={filteredData}
        keyExtractor={(item, index) =>
          item._id ? item._id.toString() : index.toString()
        }
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


            {/* Color Picker */}
            <View
              style={[
                styles.colorPickerWrapper,
                { width: colorPickerSize, height: colorPickerSize },
              ]}
            >
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
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#5D3FD3" }]}
                onPress={() => {
                  setShowColorPicker(false);
                  applyFilters(selectedColor); // Call another function
                }}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    {/*color extractor modal*/}
    <Modal
  transparent={true}
  visible={showColorExtractor}
  animationType="slide"
  onRequestClose={() => setShowColorExtractor(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Pick Color from Image</Text>


      <Button title="Pick an Image from Gallery" onPress={openImagePicker} />
      <Button title="Open Camera" onPress={openCamera} />


      {image && (
        <View style={{ position: "relative", marginTop: 20 }}>
          <TouchableOpacity onPress={handleImageTap} activeOpacity={1}>
            <Image
              source={{ uri: image }}
              style={{ width: displaySize.width, height: displaySize.height }}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setDisplaySize({ width, height });
              }}
            />
          </TouchableOpacity>


          {tapLocation && (
            <View
              style={{
                position: "absolute",
                left: (tapLocation.x / imageSize.width) * displaySize.width - 5,
                top: (tapLocation.y / imageSize.height) * displaySize.height - 5,
                width: 10,
                height: 10,
                backgroundColor: "red",
                borderRadius: 5,
              }}
            />
          )}
        </View>
      )}


      {tapLocation && (
        <Text style={{ marginTop: 10 }}>
          Original Image Tapped at: X: {tapLocation.x}, Y: {tapLocation.y}
        </Text>
      )}


{pickedColor && (
  <View style={{ marginTop: 20, alignItems: "center" }}>
    <Text>Picked Color:</Text>
    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: "black",
        backgroundColor: pickedColor,  // Ensure this is updating
      }}
    />
  </View>
)}



      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: "#5D3FD3" }]}
        onPress={() => {
          setShowColorExtractor(false);
          setSelectedColor(pickedColor);
          applyFilters(pickedColor);
        }}
      >
        <Text style={[styles.buttonText, { color: "#fff" }]}>Confirm</Text>
      </TouchableOpacity>
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
    backgroundColor: "#F8F8F8",
  },
  /** Search Bar & Color Button **/
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  colorButton: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
    shadowColor: "#5D3FD3",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  /** List Items **/
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  itemContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
  },
  brandText: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  /** Color Preview **/
  selectedColorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    backgroundColor: "#F3F3F3",
    padding: 10,
    borderRadius: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  /** Modal **/
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: Platform.OS === "web" ? "35%" : "90%",
    maxHeight: height * 0.7,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  colorPickerWrapper: {
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 280,
    maxHeight: 280,
    marginTop: 40,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 40,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 10,
    backgroundColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  closeButton: {
    backgroundColor: "#ddd",
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  webColorPickerFix: {
    position: "relative",
    left: 5,
  },
  colorPicker: {
    alignSelf: "center",
  },
  clearButton: {
    alignSelf: "center",
    backgroundColor: "#E0E0E0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
    marginTop: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
  },
});

