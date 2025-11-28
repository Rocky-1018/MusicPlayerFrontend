// screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';
import ProfileCard from '../components/ProfileCard';
import UploadSongModal from '../components/UploadSongModal';

export default function SettingsScreen() {
  const { userToken, logout } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [songModalVisible, setSongModalVisible] = useState(false);
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
  }, [userToken]);

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      await api.put(
        '/auth/me',
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
      setPasswordModalVisible(false);
    } catch (err) {
      console.log(err.response?.data || err.message);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // const handleLogout = () => {
  //   Alert.alert(
  //     'Logout',
  //     'Are you sure you want to log out?',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       { text: 'Logout', style: 'destructive', onPress: logout },
  //     ],
  //     { cancelable: true }
  //   );
  // };

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text style={styles.header}>Settings</Text>

        <ProfileCard
          username={username}
          email={email}
          setUsername={setUsername}
          setEmail={setEmail}
          profilePictureUri={profilePictureUri}
          setProfilePictureUri={setProfilePictureUri}
          updatingProfile={updatingProfile}
          onSave={handleUpdateProfile}
          userToken={userToken}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛠️ Actions</Text>

          <TouchableOpacity
            style={[styles.button, styles.actionButton]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Ionicons name="key" size={20} color="#121212" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.actionButton]}
            onPress={() => setSongModalVisible(true)}
          >
            <MaterialIcons
              name="cloud-upload"
              size={20}
              color="#121212"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Add Song</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
            <MaterialIcons name="logout" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent
          visible={passwordModalVisible}
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.sectionTitle}>🔑 Change Password</Text>

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
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <UploadSongModal
          isVisible={songModalVisible}
          onClose={() => setSongModalVisible(false)}
          userToken={userToken}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
  },
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
  sectionTitle: {
    color: '#1DB954',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    alignSelf: 'flex-start',
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
  actionButton: {
    marginBottom: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF4136',
    marginTop: 20,
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    width: '100%',
  },
});
