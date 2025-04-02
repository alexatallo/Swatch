import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { Camera } from 'expo-camera';
global.Buffer = Buffer; // Make Buffer available globally

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showColorExtractor, setShowColorExtractor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [image, setImage] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
    const [hexColor, setHexColor] = useState('#FFFFFF');
  const [pickedColor, setPickedColor] = useState("");
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const flatListRef = useRef(null);
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  // Memoize the PolishItem component
const PolishItem = React.memo(({ item, navigation }) => {
  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate("PolishScreen", { item })}
    >
      // In your PolishItem component:
<Image 
  source={{ 
    uri: item.picture,
    cache: 'force-cache'
  }} 
  style={styles.image}
  resizeMode="contain"
  fadeDuration={0}
/>
      <Text style={styles.nameText} numberOfLines={1}>{item.name || "No name"}</Text>
      <Text style={styles.brandText} numberOfLines={1}>{item.brand || "Unknown brand"}</Text>
    </TouchableOpacity>
  );
});

const openImagePicker = async (useCamera = false) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
    ...(useCamera && {
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
      cameraType: ImagePicker.CameraType.back,
    })
  });

  if (!result.canceled) {
    setImage(result.assets[0].uri);
  }
};
  
    // Request camera permissions
    const requestCameraPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    };
  
    // Pick image from gallery
    const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    };
  
    // Take photo with camera
    const takePhoto = async () => {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;
      
      setCameraVisible(true);
    };
  
    const takePicture = async () => {
      if (cameraRef) {
        try {
          const photo = await cameraRef.takePictureAsync({ quality: 1 });
          setImage(photo.uri);
          setCameraVisible(false);
        } catch (error) {
          console.error("Error taking picture:", error);
        }
      }
    };
  
    // Extract color from tapped position
    const handleImageTap = async (event) => {
      if (!image) return;
      
      const { locationX, locationY } = event.nativeEvent;
  
      try {
        // Crop 1x1 pixel at tapped location
        const manipResult = await manipulateAsync(
          image,
          [{
            crop: {
              originX: Math.round(locationX),
              originY: Math.round(locationY),
              width: 1,
              height: 1,
            },
          }],
          { format: 'png', base64: true }
        );
  
        // Simple color extraction from base64
        const hex = manipResult.base64.slice(-8).replace(/=+$/, '');
        setHexColor(`#${hex.slice(0, 6)}`);
        
      } catch (error) {
        console.error("Error extracting color:", error);
        setHexColor('#000000'); // Fallback color
      }
    }

  useEffect(() => {
    // In your fetchPolishes function:
const fetchPolishes = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(`${API_URL}/polishes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Pre-process the data with RGB values
    const processedData = response.data.data.map(item => ({
      ...item,
      rgb: item.hex ? hexToRgb(item.hex) : null,
      searchName: item.name.toLowerCase(),
    }));
    
    setPolishData(processedData);
    setFilteredData(processedData);
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
  keyExtractor={(item) => item._id.toString()} // Ensure this is stable
  numColumns={2}
  columnWrapperStyle={styles.row}
  renderItem={({ item }) => (
    <PolishItem item={item} navigation={navigation} />
  )}
  // Add these critical performance props:
  initialNumToRender={12} // Enough to fill 1.5 screens
  maxToRenderPerBatch={12}
  windowSize={5} // Reduced from default 21
  removeClippedSubviews={true}
  updateCellsBatchingPeriod={50}
  getItemLayout={(data, index) => (
    {length: 180, offset: 180 * Math.floor(index/2), index} // Adjust based on your item height
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
      {cameraVisible ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={Camera.Constants.Type.back}
            ref={ref => setCameraRef(ref)}
          />
          <View style={styles.cameraButtons}>
            <Button title="Capture" onPress={takePicture} />
            <Button title="Cancel" onPress={() => setCameraVisible(false)} />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.modalTitle}>Extract Color from Image</Text>
          <View style={styles.buttonRow}>
            <Button 
              title="Take Photo" 
              onPress={() => setCameraVisible(true)} 
            />
            <Button 
              title="Pick from Gallery" 
              onPress={() => openImagePicker(false)} 
            />
          </View>

          {image && (
            <TouchableOpacity onPress={handleImageTap} activeOpacity={1}>
              <Image 
                source={{ uri: image }} 
                style={styles.modalImage} 
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          <View style={[styles.colorBox, { backgroundColor: selectedColor }]} />
          <Text style={styles.colorText}>{selectedColor}</Text>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: "#5D3FD3" }]}
            onPress={() => {
              setShowColorExtractor(false);
              applyFilters(selectedColor);
            }}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Use This Color</Text>
          </TouchableOpacity>
        </>
      )}
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
  modalImage: {
    width: 300, 
    height: 300,
    marginVertical: 20
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20
  },
  colorBox: {
    width: 100,
    height: 100,
    marginVertical: 20,
    borderRadius: 10,
    alignSelf: 'center'
  },
  colorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  cameraContainer: {
    flex: 1,
    width: '100%'
  },
  camera: {
    flex: 1
  },
  cameraButtons: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
});

