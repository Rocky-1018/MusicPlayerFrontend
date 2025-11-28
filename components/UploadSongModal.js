// components/UploadSongModal.js
import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import api from '../api';

function UploadSongModal({ isVisible, onClose, userToken }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [duration, setDuration] = useState('');
  const [audioAsset, setAudioAsset] = useState(null);
  const [coverAsset, setCoverAsset] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setAlbum('');
    setDuration('');
    setAudioAsset(null);
    setCoverAsset(null);
  };

  const normalizePicked = (result) => {
    if (!result) return null;
    if (result.type === 'cancel' || result.canceled === true) return null;

    if (result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
      const a = result.assets[0];
      return {
        uri: a.uri,
        name: a.fileName || a.name || (a.uri && a.uri.split('/').pop()),
        mimeType: a.type || a.mimeType,
      };
    }

    const name = result.name || (result.uri ? result.uri.split('/').pop() : undefined);
    const mimeType = result.mimeType || result.type || undefined;
    return { uri: result.uri, name, mimeType };
  };

  const copyToCacheIfNeeded = async (asset) => {
    if (!asset || !asset.uri) return asset;

    const { uri, name, mimeType } = asset;

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return { uri, name, mimeType };
    }

    if (uri.startsWith('content://') || (!uri.startsWith('file://') && Platform.OS === 'android')) {
      try {
        const fileName = name || `file-${Date.now()}`;
        const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
        return { uri: cacheUri, name: fileName, mimeType };
      } catch (err) {
        console.log('copyToCacheIfNeeded copy error', err);
        return asset;
      }
    }

    return asset;
  };

  const pickFile = async (type) => {
    try {
      
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = type === 'coverArt' ? 'image/*' : 'audio/*';
          input.multiple = false;
          
          input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) {
              resolve(null);
              return;
            }

            
            if (type === 'audio') {
              const allowedTypes = [
                'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 
                'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/opus'
              ];
              const allowedExts = ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'opus'];
              const fileExt = file.name.split('.').pop().toLowerCase();
              
              if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
                Alert.alert('Error', `File type "${fileExt}" is not a supported audio format. Supported: ${allowedExts.join(', ')}`);
                resolve(null);
                return;
              }
            }

            const uri = URL.createObjectURL(file);
            const asset = { uri, name: file.name, mimeType: file.type, file, size: file.size };
            
            if (type === 'coverArt') {
              setCoverAsset(asset);
            } else {
              setAudioAsset(asset);
            }
            resolve(asset);
          };
          
          input.onerror = reject;
          input.click();
        });
      } 
      
      else {
        if (type === 'coverArt') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Permission to access media library is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
          });

          const normalized = normalizePicked(result);
          if (!normalized) return;
          
          const copied = await copyToCacheIfNeeded(normalized);
          const name = copied.name || `cover-${Date.now()}.jpg`;
          const mimeType = copied.mimeType || 'image/jpeg';
          setCoverAsset({ uri: copied.uri, name, mimeType });
        } else if (type === 'audio') {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
            copyToCacheDirectory: false,
          });

          if (!result || result.type === 'cancel') return;

          const normalized = normalizePicked(result);
          if (!normalized) return;

          const fileName = normalized.name || (normalized.uri && normalized.uri.split('/').pop()) || '';
          const fileExt = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
          const allowed = ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'opus'];
          if (fileExt && !allowed.includes(fileExt)) {
            Alert.alert('Error', `File type "${fileExt}" is not a supported audio format.`);
            return;
          }

          const copied = await copyToCacheIfNeeded(normalized);
          const finalName = copied.name || fileName || `audio-${Date.now()}.mp3`;
          const finalMime = copied.mimeType || normalized.mimeType || 'audio/mpeg';
          setAudioAsset({ uri: copied.uri, name: finalName, mimeType: finalMime });
        }
      }
    } catch (err) {
      console.log(`${type} pick error:`, err);
      Alert.alert('Error', `${type === 'audio' ? 'Audio' : 'Image'} selection failed`);
    }
  };

  const createFormFile = (asset) => {
    if (!asset) return null;

   
    if (Platform.OS === 'web' && asset.file instanceof File) {
      return asset.file;
    }

   
    const uri = asset.uri;
    const name = asset.name || uri.split('/').pop();
    const type = asset.mimeType || 'application/octet-stream';
    
    return {
      uri,
      name,
      type,
    };
  };

  const handleUploadSong = async () => {
    if (!title || !artist || !audioAsset || !coverAsset) {
      Alert.alert('Error', 'Please fill in title, artist, and select both audio and cover art files.');
      return;
    }

    setIsUploading(true);

    try {
      
      const preparedAudio = Platform.OS === 'web' ? audioAsset : await copyToCacheIfNeeded(audioAsset);
      const preparedCover = Platform.OS === 'web' ? coverAsset : await copyToCacheIfNeeded(coverAsset);

      const audioFile = createFormFile(preparedAudio);
      const coverFile = createFormFile(preparedCover);

      if (!audioFile || !coverFile) {
        throw new Error('Prepared file missing');
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('artist', artist);
      if (album) formData.append('album', album);
      if (duration) formData.append('duration', duration);
      formData.append('file', audioFile);
      formData.append('coverArt', coverFile);

      await api.post('/music/upload', formData, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      Alert.alert('Success', 'Song uploaded successfully!');
      resetForm();
      onClose();
    } catch (err) {
      console.log('Upload error:', err?.response?.data || err?.message || err);
      const errorMessage = err?.response?.data?.message || 'Failed to upload song.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.sectionTitle}>🎶 Upload New Song</Text>

          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Artist"
            placeholderTextColor="#888"
            value={artist}
            onChangeText={setArtist}
          />
          <TextInput
            style={styles.input}
            placeholder="Album (Optional)"
            placeholderTextColor="#888"
            value={album}
            onChangeText={setAlbum}
          />

          <View style={styles.filePickerContainer}>
            <TouchableOpacity style={styles.fileButton} onPress={() => pickFile('audio')}>
              <MaterialIcons name="audiotrack" size={24} color="#fff" />
              <Text style={styles.fileButtonText}>
                {audioAsset ? `Audio: ${audioAsset.name}` : 'Select Audio File'}
              </Text>
            </TouchableOpacity>
            {audioAsset && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#1DB954"
                style={styles.fileCheck}
              />
            )}
          </View>

          <View style={styles.filePickerContainer}>
            <TouchableOpacity style={styles.fileButton} onPress={() => pickFile('coverArt')}>
              <FontAwesome name="image" size={24} color="#fff" />
              <Text style={styles.fileButtonText}>
                {coverAsset ? `Cover: ${coverAsset.name}` : 'Select Cover Art'}
              </Text>
            </TouchableOpacity>
            {coverAsset && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#1DB954"
                style={styles.fileCheck}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, isUploading && { opacity: 0.6 }]}
            onPress={handleUploadSong}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>{isUploading ? 'Uploading...' : 'Submit Song'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              onClose();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  filePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  fileButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  fileCheck: {
    marginLeft: 10,
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
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UploadSongModal;
