// components/ProfileCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../api';

const ProfileCard = ({
  username,
  email,
  setUsername,
  setEmail,
  profilePictureUri,
  setProfilePictureUri,
  updatingProfile,
  onSave,
  userToken,
}) => {
  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library access is required.');
        return;
      }

    
      const mediaTypes = ImagePicker.MediaType
        ? ImagePicker.MediaType.image  
        : ImagePicker.MediaTypeOptions.Images; 

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], 
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = asset.fileName || `profile-${Date.now()}.jpg`;
    
      const mimeType = asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : asset.type) || 'image/jpeg';

      await uploadProfilePicture(uri, filename, mimeType);
    } catch (err) {
      console.log('Image pick error:', err);
      Alert.alert('Error', 'Image selection failed');
    }
  };

  const uploadProfilePicture = async (uri, filename, mimeType) => {
    try {
      let fileData;

      if (Platform.OS === 'web') {
       
        const response = await fetch(uri);
        const blob = await response.blob();
        fileData = new File([blob], filename, { type: mimeType });
      } else {
  
        let uploadUri = uri;
        if (Platform.OS === 'ios' && uri.startsWith('file://')) {
          uploadUri = uri.replace('file://', '');
        }
        fileData = { uri: uploadUri, name: filename, type: mimeType };
      }

      const formData = new FormData();
      formData.append('profilePicture', fileData);

      console.log('📤 Sending:', { filename, mimeType, platform: Platform.OS });

      const response = await fetch(`${API_BASE_URL}/api/auth/me/profile-picture`, {
        method: 'PUT', 
        headers: {
          Authorization: `Bearer ${userToken}`,
          
        },
        body: formData,
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (response.ok && data.profilePicture) {
        const newUri = `${API_BASE_URL}${data.profilePicture}?t=${Date.now()}`;
        setProfilePictureUri(newUri);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(data.message || `Upload failed: ${response.status}`);
      }
    } catch (err) {
      console.error('UPLOAD ERROR:', err);
      Alert.alert('Upload Error', err.message || 'Failed to upload profile picture');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>👤 Profile Information</Text>

      <TouchableOpacity onPress={pickAndUploadImage} style={styles.profileImageContainer}>
        <Image
          source={
            profilePictureUri
              ? { uri: profilePictureUri }
              : require('../assets/default-profile.png')
          }
          style={styles.profileImage}
        />
        <View style={styles.cameraIcon}>
          <MaterialIcons name="photo-camera" size={24} color="#121212" />
        </View>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        placeholderTextColor="#888"
        value={email}
        editable={false}
      />

      <TouchableOpacity
        style={[styles.button, updatingProfile && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={updatingProfile}
      >
        {updatingProfile ? (
          <ActivityIndicator color="#121212" />
        ) : (
          <Text style={styles.buttonText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardTitle: {
    color: '#1DB954',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    borderWidth: 3,
    borderColor: '#1DB954',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1DB954',
    borderRadius: 15,
    padding: 5,
  },
  input: {
    width: '100%',
    backgroundColor: '#333',
    color: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1DB954',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 5,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileCard;
