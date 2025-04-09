import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { ColorPicker, fromHsv } from "react-native-color-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import Slider from '@react-native-community/slider';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Colors } from '../src/colors';
// import ImageColors from 'react-native-image-colors';
// Constants
const { width, height } = Dimensions.get("window");
const colorPickerSize = Math.min(width * 0.8, 350);
const COLORS = {
  primary: "#6e3b6e",
  background: "#F8F8F8",
  card: "#FFFFFF",
  text: "#333333",
  muted: "#888888",
  border: "#E0E0E0",
};

// Utility functions
const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
};

const colorDistance = (rgb1, rgb2) => {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
};

const findSimilarColors = (targetHex, polishList, N = 15) => {
  const targetRgb = hexToRgb(targetHex);
  const distances = polishList
    .filter((item) => item.hex)
    .map((item) => ({
      ...item,
      distance: colorDistance(targetRgb, hexToRgb(item.hex)),
    }))
    .sort((a, b) => a.distance - b.distance);
  return distances.slice(0, N);
};


export default function SearchScreen({ navigation }) {
  // State
  const [polishData, setPolishData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showColorExtractor, setShowColorExtractor] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState(null);
  const [selectedColorFamily, setSelectedColorFamily] = useState([]);
  const [selectedFinish, setSelectedFinish] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState([]);
  const [selectedType, setSelectedType] = useState([]);
  const flatListRef = useRef(null);
  const [extractionError, setExtractionError] = useState(null);

  //color extractor states
  const [image, setImage] = useState(null); // Store selected image URI
  const [imageSize, setImageSize] = useState(null); // Store original image size
  const [displaySize, setDisplaySize] = useState({ width: 300, height: 300 }); // Displayed image size
  const [tapLocation, setTapLocation] = useState(null); // Store tap coordinates
  const [pickedColor, setPickedColor] = useState(null); // Store picked color
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);

  // Request permissions
  useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);

  const openImagePicker = async () => {
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

  const openCamera = async () => {
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
    try {
      if (!image || !imageSize) {
        throw new Error("Please load an image first");
      }
  
      const { locationX, locationY } = event.nativeEvent;
      const scaleX = imageSize.width / displaySize.width;
      const scaleY = imageSize.height / displaySize.height;
      const actualX = Math.round(locationX * scaleX);
      const actualY = Math.round(locationY * scaleY);
  
      const formData = new FormData();
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'color.jpg'
      });
      formData.append('x', actualX.toString());
      formData.append('y', actualY.toString());
  
      setExtractionError(null);
      setPickedColor(null);
  
      const response = await fetch(`${API_URL}/extract-color`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
  
      const responseText = await response.text();
      const data = JSON.parse(responseText); // Handle potential malformed JSON
  
      if (!response.ok) {
        throw new Error(data.error || "Server error");
      }
  
      if (!data.hex) {
        throw new Error("Invalid color data received");
      }
  
      setPickedColor(data.hex);
      setSelectedColor(data.hex);
      applyColorFilter(data.hex);
  
    } catch (error) {
      console.error("Color extraction failed:", error);
      setExtractionError(error.message);
    }
  };
  
  const getPixelColor = async (imageUri) => {
    const colors = await ImageColors.getColors(imageUri, { fallback: 'gray' });
    return colors.primary;  // Returns the dominant color as hex
  }  


  const filters = {
    Color: ["Blue", "Pink", "Red", "Purple", "Green", "Yellow", "Orange", "Brown", "Black", "White", "Gray"],
    Brand: ['OPI', 'DND'],
    Finish: ['Shimmer','Creme','Glitter','Pearl','Dark', 'Rose Gold', 'Metallic'],
    Type: ['Infinite Shine', 'RapiDry', 'Gel Nail Polish', 'Nail Lacquer', 'Lacquer & Gel'],
  };

  // Memoized values
  const hasActiveFilters = useMemo(() => (
    searchQuery || 
    selectedColor || 
    selectedColorFamily.length > 0 || 
    selectedFinish.length > 0 || 
    selectedBrand.length > 0 || 
    selectedType.length > 0
  ), [searchQuery, selectedColor, selectedColorFamily, selectedFinish, selectedBrand, selectedType]);

  // Effects
  useEffect(() => {
    const fetchPolishes = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("Token is missing");
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`${API_URL}/polishes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data?.data) {
          const processedData = response.data.data.map(item => ({
            ...item,
            rgb: item.hex ? hexToRgb(item.hex) : null,
            searchName: item.name.toLowerCase(),
          }));
          setPolishData(processedData);
          setFilteredData(processedData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolishes();
  }, []);

  // Handler functions
  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = text.trim() === "" 
      ? polishData 
      : polishData.filter(item => item.name.toLowerCase().includes(text.toLowerCase()));
    setFilteredData(filtered);
  };

  const applyColorFilter = (colorHex) => {
    setSelectedColor(colorHex);
    const filtered = colorHex ? findSimilarColors(colorHex, polishData, 15) : polishData;
    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedColor("");
    setSelectedColorFamily([]);
    setSelectedFinish([]);
    setSelectedBrand([]);
    setSelectedType([]);
    setFilteredData(polishData);
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  const applyModalFilters = () => {
    let results = [...polishData];
    
    if (selectedColorFamily.length > 0) {
      results = results.filter(p => 
        selectedColorFamily.some(f => 
          p["color family"]?.toLowerCase().includes(f.toLowerCase()) // Updated field name
        )
      );
    }
    if (selectedFinish.length > 0) {
      results = results.filter(p => 
        selectedFinish.some(f => p.finish?.toLowerCase().includes(f.toLowerCase()))
      );
    }
    if (selectedBrand.length > 0) {
      results = results.filter(p => 
        selectedBrand.some(b => p.brand?.toLowerCase().includes(b.toLowerCase()))
      );
    }
    if (selectedType.length > 0) {
      results = results.filter(p => 
        selectedType.some(t => p.type?.toLowerCase().includes(t.toLowerCase()))
      );
    }
    
    setFilteredData(results);
    setShowFilterModal(false);
  };

  const handleFilterSelect = (filterType, option) => {
    if (filterType === "Color") {
      setSelectedColorFamily((prev) =>
        prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
      );
    } else if (filterType === "Finish") {
      setSelectedFinish((prev) =>
        prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
      );
    } else if (filterType === "Brand") {
      setSelectedBrand((prev) =>
        prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
      );
    } else if (filterType === "Type") { // Add Type logic
      setSelectedType((prev) =>
        prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
      );
    }
  };

  // Component rendering
  if (loading) {
    return <ActivityIndicator size="large" color="#E0E0E0" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {/* Search Input in place of tabs */}
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search polish name..."
            placeholderTextColor="#888"
            value={searchQuery} 
            onChangeText={handleSearch}
          />
        </View>

        {/* Right Action Buttons */}
        <View style={styles.actionsRight}>
          <TouchableOpacity 
            onPress={() => setShowColorPicker(true)} 
            style={styles.iconButton}
          >
            <Ionicons name="color-palette-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowColorExtractor(true)} 
            style={styles.iconButton}
          >
            <Ionicons name="camera-outline" size={24} color={COLORS.primary}  />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowFilterModal(true)} 
            style={styles.iconButton}
          >
            <Ionicons name="filter-outline" size={24} color={COLORS.primary}  />
          </TouchableOpacity>
        </View>
      </View>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}

      {/* Polish List */}
      <FlatList
      style={styles.flatList}
        ref={flatListRef}
        data={filteredData}
        keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <PolishItem item={item} navigation={navigation} />
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Color Picker Modal */}
      <Modal transparent visible={showColorPicker} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Color</Text>
            <TouchableOpacity 
                              onPress={() => {
                                setShowColorPicker(false);
                              }}
                              style={styles.modalClose}
                            >
                              <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                            </View>
            <ColorPicker
              onColorChange={(color) => setSelectedColor(fromHsv(color))}
              sliderComponent={Slider}
              style={[styles.colorPicker, { width: colorPickerSize, height: colorPickerSize }]}
            />
            <View style={styles.modalButtons}>
              <ActionButton 
                text="Apply" 
                primary 
                onPress={() => {
                  setShowColorPicker(false);
                  applyColorFilter(selectedColor);
                }} 
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal transparent visible={showFilterModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Polishes</Text>
            <TouchableOpacity 
                              onPress={() => {
                                setShowFilterModal(false);}}
                              style={styles.modalClose}
                            >
                              <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                            </View>
            <ScrollView horizontal contentContainerStyle={styles.filterTabs}>
              {Object.keys(filters).map((type) => (
                <FilterTab 
                  key={type}
                  type={type}
                  isActive={selectedFilterType === type}
                  onPress={() => setSelectedFilterType(type)}
                />
              ))}
            </ScrollView>

            <ScrollView style={styles.filterOptions}>
              {selectedFilterType && filters[selectedFilterType].map((option) => (
                <FilterOption
                  key={option}
                  option={option}
                  isSelected={
                    (selectedFilterType === "Color" && selectedColorFamily.includes(option)) ||
                    (selectedFilterType === "Finish" && selectedFinish.includes(option)) ||
                    (selectedFilterType === "Brand" && selectedBrand.includes(option)) ||
                    (selectedFilterType === "Type" && selectedType.includes(option))
                  }
                  onPress={() => handleFilterSelect(selectedFilterType, option)}
                />
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <ActionButton text="Apply" primary onPress={applyModalFilters} />
            </View>
          </View>
        </View>
      </Modal>

     
      <Modal transparent visible={showColorExtractor} animationType="slide">
      <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Extract Color</Text>
            <TouchableOpacity 
          onPress={() => setShowColorExtractor(false)}
          style={styles.modalClose}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
            
      {image && (
        <View style={{ alignSelf: 'center', position: "relative", marginTop: 20 }}>
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

          {/* Display tap location indicator */}
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

      {/* Display extracted color */}
      {pickedColor && (
        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Text backgroundColor={pickedColor}>Picked Color:</Text>
        </View>
      )}

<View style={styles.imageButtonContainer}>
        <TouchableOpacity
          style={[styles.imageButton, styles.galleryButton]}
          onPress={openImagePicker}
        >
          <Text style={styles.imageButtonText}>Pick from Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.imageButton, styles.cameraButton]}
          onPress={openCamera}
        >
          <Text style={styles.imageButtonText}>Open Camera</Text>
        </TouchableOpacity>
            </View>
      </View>
      </View>
    </Modal>
      </SafeAreaView>
    </View>
  );
}


const ActionButton = ({ text, onPress, primary = false }) => (
  <TouchableOpacity
    style={[styles.actionButton, primary && styles.primaryButton]}
    onPress={onPress}
  >
    <Text style={[styles.buttonText, primary && styles.primaryButtonText]}>
      {text}
    </Text>
  </TouchableOpacity>
);

const PolishItem = React.memo(({ item, navigation }) => (
  <TouchableOpacity
    style={styles.itemContainer}
    onPress={() => navigation.navigate("PolishScreen", { item })}
  >
    <Image source={{ uri: item.picture }} style={styles.itemImage} />
    <Text style={styles.itemName} numberOfLines={1}>{item.name || "No name"}</Text>
    <Text style={styles.itemBrand} numberOfLines={1}>{item.brand || "Unknown brand"}</Text>
  </TouchableOpacity>
));

const FilterTab = ({ type, isActive, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.filterTab}>
    <Text style={[
      styles.filterTabText, 
      isActive && styles.activeFilterTabText,
      isActive && styles.filterTabUnderline
    ]}>
      {type}
    </Text>
  </TouchableOpacity>
);

const FilterOption = ({ option, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.filterOption, isSelected && styles.selectedFilterOption]}
    onPress={onPress}
  >
    <Text style={[styles.filterOptionText, isSelected && styles.selectedFilterOptionText]}>
      {option}
    </Text>
  </TouchableOpacity>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  buttonGroup: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 2,
  },
  activeFilterButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  iconText: {
    fontSize: 20,
  },
  clearButton: {
    alignSelf: "center",
    backgroundColor: "#E0E0E0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
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
  listContent: {
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemContainer: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center'
  },
  filterModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center', 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 5,
    width: '100%',  
    position: 'relative',  
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,  
  },
  modalClose: {
    position: 'absolute',  
    right: 0,  
    padding: 4,
  },
  colorPicker: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    width: 120, 
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontWeight: '500',
  },
  primaryButtonText: {
    color: 'white',
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  filterTab: {
    marginHorizontal: 12, // Space between tabs
    paddingVertical: 8,
  },
  filterTabText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterTabUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
  },
  filterOptions: {
    maxHeight: height * 0.4,
    marginVertical: 8,
  },
  filterOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: COLORS.border,
  },
  selectedFilterOption: {
    backgroundColor: COLORS.primary,
  },
  filterOptionText: {
    color: COLORS.text,
    justifyContent: 'center'
  },
  selectedFilterOptionText: {
    color: 'white',
  },
  imageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  imageButton: {
    width: '48%',  
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButton: {
    backgroundColor: '#5D3FD3',  
    marginRight: 10,
  },
  cameraButton: {
    backgroundColor: '#5D3FD3', 
  },
  imageButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  flatList: {
    marginTop: 10,
    flex: 1,
  },   
  colorPreviewContainer: {
    marginTop: 20,
    width: '100%',
    padding: 16,
    backgroundColor: '#FFF9F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE6E6',
  },
  colorPreviewLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF85A2',
    marginBottom: 12,
    textAlign: 'center',
  },
  colorDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    elevation: 2,
  },
  colorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'white',
    elevation: 3,
  },
  colorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  colorHex: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  colorSubtext: {
    fontSize: 14,
    color: '#FF85A2',
    marginTop: 4,
  },
  checkmarkButton: {
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF85A2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  checkmarkText: {
    fontSize: 12,
    color: '#FF85A2',
    marginTop: 4,
    fontWeight: '600',
  },
});