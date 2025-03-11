/* import React, { useState, useEffect } from "react";
import { View, Button, Text, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

const EyedropperTool = () => {
  const [image, setImage] = useState(null); // Store selected image URI
  const [pickedColor, setPickedColor] = useState(null); // Store picked color
  const [hasCameraPermission, setHasCameraPermission] = useState(null); // Camera permission state
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null); // Media library permission state

  // Request permissions for camera and media library on mount
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);

  // Function to pick an image from the gallery
  const openImagePicker = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaType: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const pickedUri = result.assets[0].uri;
      console.log("Picked Image URI:", pickedUri);
      setImage(pickedUri);
    }
  };

  // Function to open the camera and take a picture
  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      const pickedUri = result.assets[0].uri;
      console.log("Captured Image URI:", pickedUri);
      setImage(pickedUri);
    }
  };

  // Function to extract color from the image where the user taps
  const getColorFromImage = async (event) => {
    if (!image) return;

    const { locationX, locationY } = event.nativeEvent;

    try {
      // Crop the image at the tapped point (small 1x1 pixel area)
      const croppedImage = await ImageManipulator.manipulateAsync(
        image,
        [{ crop: { originX: locationX, originY: locationY, width: 1, height: 1 } }],
        { format: ImageManipulator.SaveFormat.PNG }
      );

      console.log("Cropped Image URI:", croppedImage.uri);

      // Now, analyze the cropped image to get the pixel color
      setPickedColor(croppedImage.uri);
    } catch (error) {
      console.error("Error extracting color:", error);
    }
  };

  // Render content based on permissions
  if (hasCameraPermission === null || hasMediaLibraryPermission === null) {
    return <Text>Requesting permissions...</Text>;
  }

  if (hasCameraPermission === false || hasMediaLibraryPermission === false) {
    return <Text>No access to camera or media library</Text>;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Buttons to open the camera or select an image */
    /*}
      <Button title="Pick an Image from Gallery" onPress={openImagePicker} />
      <Button title="Open Camera" onPress={openCamera} />

      {/* Display the selected image */
    /*}
      {image && (
        <TouchableOpacity onPress={getColorFromImage}>
          <Image
            source={{ uri: image }}
            style={{ width: 300, height: 300, marginTop: 20 }}
          />
        </TouchableOpacity>
      )}

      {/* Display the picked color */
    /*}
      {pickedColor && (
        <View style={{ marginTop: 20 }}>
          <Text>Picked Color:</Text>
          <Image
            source={{ uri: pickedColor }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 2,
              borderColor: "black",
            }}
          />
        </View>
      )}
    </View>
  );
};

export default EyedropperTool;
*/

import React, { useState, useEffect } from "react";
import { View, Button, Text, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const EyedropperTool = () => {
  const [image, setImage] = useState(null); // Store selected image URI
  const [pickedColor, setPickedColor] = useState(null); // Store picked color
  const [hasCameraPermission, setHasCameraPermission] = useState(null); // Camera permission state
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null); // Media library permission state

  // Request permissions for camera and media library on mount
  useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);

  // Function to pick an image from the gallery
  const openImagePicker = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaType: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const pickedUri = result.assets[0].uri;
      console.log("Picked Image URI:", pickedUri);
      setImage(pickedUri);
    }
  };

  // Function to open the camera and take a picture
  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      const pickedUri = result.assets[0].uri;
      console.log("Captured Image URI:", pickedUri);
      setImage(pickedUri);
    }
  };

  // Function to extract color from the image where the user taps
  const getColorFromImage = async (event) => {
    if (!image) return;

    const { locationX, locationY } = event.nativeEvent;

    try {
      // Crop the image at the tapped point (small 1x1 pixel area)
      const croppedImage = await ImageManipulator.manipulateAsync(
        image,
        [
          {
            crop: {
              originX: locationX,
              originY: locationY,
              width: 1,
              height: 1,
            },
          },
        ],
        { format: ImageManipulator.SaveFormat.PNG }
      );

      console.log("Cropped Image URI:", croppedImage.uri);

      // Here you can extract the color from the cropped image
      // Use the image URI or process the color data further if needed
      setPickedColor(croppedImage.uri);
    } catch (error) {
      console.error("Error extracting color:", error);
    }
  };

  // Render content based on permissions
  if (hasCameraPermission === null || hasMediaLibraryPermission === null) {
    return <Text>Requesting permissions...</Text>;
  }

  if (hasCameraPermission === false || hasMediaLibraryPermission === false) {
    return <Text>No access to camera or media library</Text>;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Buttons to open the camera or select an image */}
      <Button title="Pick an Image from Gallery" onPress={openImagePicker} />
      <Button title="Open Camera" onPress={openCamera} />

      {/* Display the selected image */}
      {image && (
        <TouchableOpacity onPress={getColorFromImage}>
          <Image
            source={{ uri: image }}
            style={{ width: 300, height: 300, marginTop: 20 }}
          />
        </TouchableOpacity>
      )}

      {/* Display the picked color */}
      {pickedColor && (
        <View style={{ marginTop: 20 }}>
          <Text>Picked Color:</Text>
          <Image
            source={{ uri: pickedColor }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 2,
              borderColor: "black",
            }}
          />
        </View>
      )}
    </View>
  );
};

export default EyedropperTool;
