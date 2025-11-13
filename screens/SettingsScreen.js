import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api';  // Axios instance already configured with auth token
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const { userToken } = useAuth();

  // User info state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState(null);

  // Loading & error states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change password modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    // Load user profile on mount
    const loadUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setUsername(res.data.username);
        setEmail(res.data.email);
        if (res.data.profilePicture) {
          setProfilePictureUri(`http://localhost:5000/uploads/profile_pictures/${res.data.profilePicture}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadUserProfile();
  }, []);

  // Handle profile updates (username, email)
  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      await api.put('/users/me', { username, email });
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Pick new profile image and upload
  const pickAndUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.cancelled) {
        setProfilePictureUri(result.uri);
        await uploadProfilePicture(result.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Image selection failed');
    }
  };

  // Upload profile picture to backend
  const uploadProfilePicture = async (uri) => {
    const formData = new FormData();
    formData.append('profilePicture', {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    });

    try {
      await api.post('/auth/me/profile-picture', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      Alert.alert('Success', 'Profile picture updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload profile picture');
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match');
      return;
    }

    setChangingPassword(true);

    try {
      await api.put('/users/me/password', { oldPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to change password'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Profile Section */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <TouchableOpacity onPress={pickAndUploadImage}>
        <Image
          source={
            profilePictureUri
              ? { uri: profilePictureUri }
              : require('../assets/default-profile.png') // fallback image in assets
          }
          style={styles.profileImage}
        />
        <Text style={styles.changePictureText}>Change Profile Picture</Text>
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
        placeholderTextColor="#888"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity
        style={[styles.button, updatingProfile && { opacity: 0.6 }]}
        onPress={handleUpdateProfile}
        disabled={updatingProfile}
      >
        <Text style={styles.buttonText}>
          {updatingProfile ? 'Updating...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

      {/* Change Password Section */}
      <TouchableOpacity
        style={[styles.button, { marginTop: 30 }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Old Password"
              placeholderTextColor="#888"
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="New Password"
              placeholderTextColor="#888"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm New Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, changingPassword && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={styles.buttonText}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#1DB954',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#333',
    marginBottom: 10,
  },
  changePictureText: {
    color: '#1DB954',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#333',
    color: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#1DB954',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
  },
});
