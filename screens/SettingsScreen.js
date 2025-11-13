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
import api, { API_BASE_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { userToken } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        setUsername(res.data.username);
        setEmail(res.data.email);

        if (res.data.profilePicture) {
          // Cache busting on initial load
          const profilePath = res.data.profilePicture;
          const cacheBustedUri = `${API_BASE_URL}${profilePath}?timestamp=${new Date().getTime()}`;
          setProfilePictureUri(cacheBustedUri);
        } else {
          setProfilePictureUri(null);
        }
      } catch (err) {
        console.log(err);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      await api.put(
        '/users/me',
        { username, email },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      Alert.alert('Success', 'Profile updated');
    } catch (err) {
      console.log(err.response?.data || err.message);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        quality: 1,
      });

      if (!result.canceled) {
        // New SDK uses result.assets array
        const uri = result.assets ? result.assets[0].uri : result.uri;
        await uploadProfilePicture(uri);
      }
    } catch (err) {
      console.log('Image pick error:', err);
      Alert.alert('Error', 'Image selection failed');
    }
  };

 const uploadProfilePicture = async (uri) => {
  const formData = new FormData();
  const fileExt = uri.split('.').pop();
  const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

  formData.append('profilePicture', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name: `profile.${fileExt}`,
    type: mimeType,
  });

  try {
    const res = await api.put('/auth/me/profile-picture', formData, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (res.data.profilePicture) {
      const newUri = `${API_BASE_URL}${res.data.profilePicture}?timestamp=${new Date().getTime()}`;
      setProfilePictureUri(newUri);
      Alert.alert('Success', 'Profile picture updated');
    }
  } catch (err) {
    console.log(err.response?.data || err.message);
    const errorMessage = err.response?.data?.message || 'Failed to upload profile picture';
    Alert.alert('Error', errorMessage);
  }
};


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
      await api.put(
        '/auth/me/password',
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Success', 'Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setModalVisible(false);
    } catch (err) {
      console.log(err.response?.data || err.message);
      Alert.alert('Error', 'Failed to change password');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <TouchableOpacity onPress={pickAndUploadImage}>
        <Image
          source={profilePictureUri ? { uri: profilePictureUri } : require('../assets/default-profile.png')}
          style={styles.profileImage}
        />
        <Text style={styles.changePictureText}>Change Profile Picture</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#888" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" placeholderTextColor="#888" value={email} onChangeText={setEmail} />

      <TouchableOpacity
        style={[styles.button, updatingProfile && { opacity: 0.6 }]}
        onPress={handleUpdateProfile}
        disabled={updatingProfile}
      >
        <Text style={styles.buttonText}>{updatingProfile ? 'Updating...' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <TextInput style={styles.input} secureTextEntry placeholder="Old Password" placeholderTextColor="#888" value={oldPassword} onChangeText={setOldPassword} />
            <TextInput style={styles.input} secureTextEntry placeholder="New Password" placeholderTextColor="#888" value={newPassword} onChangeText={setNewPassword} />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm New Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={[styles.button, changingPassword && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={changingPassword}>
              <Text style={styles.buttonText}>{changingPassword ? 'Changing...' : 'Change Password'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, alignItems: 'center' },
  sectionTitle: { color: '#1DB954', fontSize: 22, fontWeight: 'bold', marginBottom: 15, alignSelf: 'flex-start' },
  profileImage: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#333', marginBottom: 10 },
  changePictureText: { color: '#1DB954', marginBottom: 20, textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#333', color: 'white', padding: 12, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#1DB954', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#ccc', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: '#222', borderRadius: 10, padding: 20 },
});