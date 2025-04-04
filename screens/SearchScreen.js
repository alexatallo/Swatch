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
  ActivityIndicator,
} from "react-native";
import { ColorPicker, fromHsv } from "react-native-color-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import Slider from '@react-native-community/slider';
// Constants
const { width, height } = Dimensions.get("window");
const colorPickerSize = Math.min(width * 0.8, 350);
const COLORS = {
  primary: "#5D3FD3",
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
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search polish name..."
          placeholderTextColor={COLORS.muted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        
        <View style={styles.buttonGroup}>
          <IconButton 
            icon="🎨" 
            onPress={() => setShowColorPicker(true)} 
            style={styles.iconButton}
          />
          <IconButton 
            icon="📷" 
            onPress={() => setShowColorExtractor(true)} 
            style={styles.iconButton}
          />
          <IconButton 
            icon="☰" 
            onPress={() => setShowFilterModal(true)} 
            style={styles.iconButton}
          />
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
            <Text style={styles.modalTitle}>Select a Color</Text>
            <ColorPicker
              onColorChange={(color) => setSelectedColor(fromHsv(color))}
              sliderComponent={Slider}
              style={[styles.colorPicker, { width: colorPickerSize, height: colorPickerSize }]}
            />
            <View style={styles.modalButtons}>
              <ActionButton text="Cancel" onPress={() => setShowColorPicker(false)} />
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
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Filter Polishes</Text>
            
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
              <ActionButton text="Cancel" onPress={() => setShowFilterModal(false)} />
              <ActionButton text="Apply" primary onPress={applyModalFilters} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Reusable Components
const IconButton = ({ icon, onPress, style }) => (
  <TouchableOpacity style={[styles.iconButton, style]} onPress={onPress}>
    <Text style={styles.iconText}>{icon}</Text>
  </TouchableOpacity>
);

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
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.activeFilterTab]}
    onPress={onPress}
  >
    <Text style={[styles.filterTabText, isActive && styles.activeFilterTabText]}>
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
    padding: 16,
    backgroundColor: COLORS.background,
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
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    fontSize: 16,
    color: COLORS.text,
    elevation: 2,
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
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    marginVertical: 8,
    elevation: 1,
  },
  clearButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
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
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
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
    paddingBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORS.border,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.text,
  },
  activeFilterTabText: {
    color: 'white',
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
  },
  selectedFilterOptionText: {
    color: 'white',
  },
});