import React, { useState, useEffect } from "react";
import { View, Button, Text, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const EyedropperTool = () => {
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

  // Pick image from gallery
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

  // Open camera
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

  // Convert tap location to actual image coordinates
  const handleImageTap = async (event) => {
    if (!image || !imageSize) return;

    const { locationX, locationY } = event.nativeEvent;

    // Scale tap coordinates to match the original image size
    const actualX = Math.round((locationX / displaySize.width) * imageSize.width);
    const actualY = Math.round((locationY / displaySize.height) * imageSize.height);

    setTapLocation({ x: actualX, y: actualY });

    console.log(`Tapped at Display: X=${locationX}, Y=${locationY}`);
    console.log(`Mapped to Original Image: X=${actualX}, Y=${actualY}`);

    try {
      // Crop the image at the corrected tap point (1x1 pixel)
      const croppedImage = await ImageManipulator.manipulateAsync(
        image,
        [{ crop: { originX: actualX, originY: actualY, width: 1, height: 1 } }],
        { format: ImageManipulator.SaveFormat.PNG }
      );

      console.log("Cropped Image URI:", croppedImage.uri);
      setPickedColor(croppedImage.uri);
    } catch (error) {
      console.error("Error extracting color:", error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
