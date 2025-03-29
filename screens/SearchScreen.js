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
  ScrollView,
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
  const [pickedColor, setPickedColor] = useState("");
  const [colorFamPolishData, setColorFamPolishData] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [image, setImage] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [displaySize, setDisplaySize] = useState({ width: 300, height: 300 });
  const [tapLocation, setTapLocation] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState(null);
  const [filterOptions, setFilterOptions] = useState([]);
  const [selectedColorFamily, setSelectedColorFamily] = useState([]);
  const [selectedFinish, setSelectedFinish] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState([]);
  const flatListRef = useRef(null);

  const filters = {
    ColorFamily: ["Blue", "Pink", "Red", "Purple", "Green", "Yellow", "Orange", 
            "Brown", "Black", "White", "Gray"],
    Brand: ['OPI', 'Brand B', 'Brand C'],
    Finish: ['Shimmer', 'Metalic', 'Creme','Glitter','Pearl','Dark', 'Rose Gold'],
  };
    useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);

  // const showFilterOptions = () => {
  //   return filterOptions.map((option, index) => (
  //       <TouchableOpacity
  //           key={index}
  //           style={styles.filterOptionButton}
  //           onPress={() => handleFilterSelect(option)} // Pass the selected color family
  //       >
  //           <Text style={styles.filterOptionText}>{option}</Text>
  //       </TouchableOpacity>
    // ));

  const showFilterOptions = () => {
    return filterOptions.map((option, index) => {
      const isSelected =
        (selectedFilterType === "ColorFamily" && selectedColorFamily.includes(option)) ||
        (selectedFilterType === "Finish" && selectedFinish.includes(option)) ||
        (selectedFilterType === "Brand" && selectedBrand.includes(option));
  
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.filterOptionButton,
            isSelected && { backgroundColor: "#5D3FD3" }, // Highlight selected options
          ]}
          onPress={() => handleFilterSelect(selectedFilterType, option)}
        >
          <Text style={[styles.filterOptionText, isSelected && { color: "#fff" }]}>
            {option}
          </Text>
        </TouchableOpacity>
      );
    });
  };



const findPolishesByFinish = async (finishes) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("❌ No token received");
      navigation.navigate("LoginScreen");
      return [];
    }
    const normalizedFinishes = finishes.map(finish => finish.toLowerCase());
    const response = await axios.get(`${API_URL}/polishes`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      params: { finish: normalizedFinishes.join(',') }, // Use `finish` as the query parameter
    });
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching polishes by finish:", error);
    return [];
  }
};

  const findColorsFamily = async (colors) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("❌ No token received");
        navigation.navigate("LoginScreen");
        return [];
      }
      const normalizedColors = colors.map(color => color.toLowerCase());
      const response = await axios.get(`${API_URL}/polishes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: { colorFamily: normalizedColors.join(',') },
      });
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching color families:", error);
      return [];
    }
  };
  
  const openFilterModal = (filterType) => {
    setSelectedFilterType(filterType);
    setFilterOptions(filters[filterType] || []);
    setShowFilterModal(true);
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

  // const applyFilters = useCallback(
  //   async (color = selectedColor, search = searchQuery) => {
  //     if (!color && !search) {
  //       setFilteredData(polishData);
  //       setForceUpdate((prev) => !prev);
  //       return;
  //     }
  //     let filtered = polishData;
  //     if (color) {
  //       filtered = findSimilarColors(color, filtered, 15);
  //       try {
  //         const colorFamilyData = await findColorsFamily([color]);
  //         if (Array.isArray(colorFamilyData) && colorFamilyData.length > 0) {
  //           filtered = filtered.filter((item) =>
  //             colorFamilyData.some((cf) => cf.hex?.toLowerCase() === item.hex?.toLowerCase())
  //           );
  //         }
  //       } catch (error) {
  //         console.error("Error fetching color family data:", error);
  //       }
  //     }
  //     if (search) {
  //       filtered = filtered.filter((item) =>
  //         item.name.toLowerCase().includes(search.toLowerCase())
  //       );
  //     }
  //     setFilteredData(filtered);
  //     setForceUpdate((prev) => !prev);
  //     flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  //   },
  //   [selectedColor, searchQuery, polishData]
  // );

  const applyFilters = async () => {
    try {
      setLoading(true);
  
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("❌ No token received");
        navigation.navigate("LoginScreen");
        return;
      }
  
      const params = {};
      if (selectedColorFamily.length > 0) {
        params.colorFamily = selectedColorFamily.join(",");
      }
      if (selectedFinish.length > 0) {
        params.finish = selectedFinish.join(",");
      }
      if (selectedBrand.length > 0) {
        params.brand = selectedBrand.join(",");
      }
  
      console.log("📡 Applying filters with params:", params);
  
      const response = await axios.get(`${API_URL}/polishes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params,
      });
  
      if (response.data && Array.isArray(response.data.data)) {
        setFilteredData(response.data.data);
      } else {
        console.error("Unexpected response format:", response.data);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Error applying filters:", error);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setShowFilterModal(false); // Close the filter modal
    }
  };












  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        setImage(result.assets[0].uri); // Set the captured image URI
        const { width, height } = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1 }
        );
        setImageSize({ width, height }); // Set the image size
      }
    } catch (error) {
      console.error("Error opening camera:", error);
    }
  };
  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        setImage(result.assets[0].uri); // Set the selected image URI
        const { width, height } = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1 }
        );
        setImageSize({ width, height }); // Set the image size
      }
    } catch (error) {
      console.error("Error picking image:", error);
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

  const clearFilters = () => {
    setSearchQuery(""); // Clear the search query
    setSelectedColor(""); // Clear the selected color
    setFilteredData(polishData); // Reset the filtered data to the original polish data
    setSelectedColorFamily([]);
  setSelectedFinish([]);
  setSelectedBrand([]);
    
    
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 }); // Scroll to the top of the list
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(selectedColor, text);
  };


  const handleFilterSelect = (filterType, option) => {
    if (filterType === "ColorFamily") {
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
    }
  };










  // const handleFilterSelect = async (filterType) => {
  //   try {
  //     setLoading(true); // Show loading indicator while fetching data
  //     let filteredData = [];
  //     if (selectedFilterType === "ColorFamily") {
  //       filteredData = await findColorsFamily([filterType]);
  //     } else if (selectedFilterType === "Type") {
  //       filteredData = await findPolishesByType([filterType]);
  //     } else if (selectedFilterType === "Finish") {
  //       filteredData = await findPolishesByFinish([filterType]);
  //     }
  //     if (Array.isArray(filteredData) && filteredData.length > 0) {
  //       setFilteredData(filteredData); // Update the displayed list
  //     } else {
  //       console.log("No polishes found for the selected filter.");
  //       setFilteredData([]); // Clear the list if no results
  //     }
  //   } catch (error) {
  //     console.error("Error fetching polishes for filter:", error);
  //   } finally {
  //     setShowFilterModal(false); // Close the filter modal
  //     setLoading(false); // Hide loading indicator
  //   }
  // };

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

    {/* Filter Button */}
    <TouchableOpacity
      style={styles.filterButton} // Add custom styles for the filter button
      onPress={() => setShowFilterModal(true)} // Trigger the filter modal
    >
      <Text style={styles.buttonText}>Filter</Text>
    </TouchableOpacity>
  </View>

  {/* Filter Modal */}
  <Modal
  transparent={true}
  visible={showFilterModal}
  animationType="slide"
  onRequestClose={() => setShowFilterModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Select Filters</Text>

      {/* Filter Categories */}
      <View style={styles.filterCategoryContainer}>
        {["ColorFamily", "Brand", "Finish"].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={styles.filterCategoryButton}
            onPress={() => openFilterModal(filterType)}
          >
            <Text style={styles.filterCategoryText}>{filterType}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Options */}
      <ScrollView style={styles.filterOptionsContainer}>
        {showFilterOptions()}
      </ScrollView>

      {/* Apply and Clear Buttons */}
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={applyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearFilters}
        >
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

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
    renderItem={({ item }) => {
      console.log("Rendering Item:", item);
      return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => navigation.navigate("PolishScreen", { item })}
      >
        <Image source={{ uri: item.picture }} style={styles.image} />
        <Text style={styles.nameText}>{item.name || "No name"}</Text>
        <Text style={styles.brandText}>{item.brand || "Unknown brand"}</Text>
      </TouchableOpacity>
    );
    }}
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
          style={[styles.colorPickerWrapper, { width: colorPickerSize, height: colorPickerSize }]}
        >
          <View style={Platform.OS === "web" ? styles.webColorPickerFix : null}>
            <ColorPicker
              onColorChange={(color) => setSelectedColor(fromHsv(color))}
              sliderComponent={Slider}
              style={[styles.colorPicker, { width: colorPickerSize, height: colorPickerSize }]}
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

  {/* Color Extractor Modal */}
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

        {/* Display mapped tap coordinates */}
        {tapLocation && (
          <Text style={{ marginTop: 10 }}>
            Original Image Tapped at: X: {tapLocation.x}, Y: {tapLocation.y}
          </Text>
        )}

        {/* Display extracted color */}
        {pickedColor && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <Text>Picked Color:</Text>
            <Image
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                borderWidth: 2,
                borderColor: "black",
                backgroundColor: pickedColor,
              }}
            />
          </View>
        )}
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: "#5D3FD3" }]}
          onPress={() => {
            setShowColorExtractor(false);
            applyFilters(pickedColor); // Call another function
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
  filterButton: {
    backgroundColor: "#5D3FD3",  // Change color as per your design
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,  // Adjust spacing as needed
    justifyContent: "center",
    alignItems: "center",
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
  filterCategoryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  filterCategoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#5D3FD3",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  filterCategoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  filterOptionsContainer: {
    width: "100%",
    maxHeight: height * 0.4, // Add a maxHeight to avoid excessive scrolling
  },
  filterOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginVertical: 6,
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
  applyButton: {
    backgroundColor: "#5D3FD3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
});