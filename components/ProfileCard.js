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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE_URL } from '../api';

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

      const modern = ImagePicker.MediaType || null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: modern ? [modern.Image] : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const name = asset.fileName || uri.split('/').pop();
      const mimeType = asset.mimeType || 'image/jpeg';

      await uploadProfilePicture(uri, name, mimeType);
    } catch (err) {
      console.log('Image pick error:', err);
      Alert.alert('Error', 'Image selection failed');
    }
  };

  const uploadProfilePicture = async (uri, filename, mimeType) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = filename ? filename.split('.').pop() : 'jpg';
      const guessedMime = mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      const formData = new FormData();
      formData.append('profilePicture', blob, filename || `profile.${fileExt}`);

      const res = await api.put('/auth/me/profile-picture', formData, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (res.data?.profilePicture) {
        const newUri = `${API_BASE_URL}${res.data.profilePicture}?timestamp=${Date.now()}`;
        setProfilePictureUri(newUri);
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (err) {
      console.log(err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Failed to upload profile picture';
      Alert.alert('Error', msg);
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
