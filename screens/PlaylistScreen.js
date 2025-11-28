import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import api, { API_BASE_URL } from '../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayback } from '../contexts/PlaybackContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const STATIC_BASE_URL = API_BASE_URL;

export default function PlaylistScreen({ navigation }) {
  const [likedMusic, setLikedMusic] = useState([]);
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    likedMusic: playbackLikedMusic,
    toggleLike,
    setPlaylist
  } = usePlayback();

  // Fetch liked music whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchLikedMusic = async () => {
        try {
          const res = await api.get('auth/me/liked-music');
          setLikedMusic(res.data);
        } catch (err) {
          console.error('Failed to fetch liked music', err);
        }
      };
      fetchLikedMusic();
    }, [])
  );

  // Play a song and navigate to NowPlaying inside Home stack
  const handleSongPress = (track) => {
    setPlaylist(likedMusic);
    playTrack(track, likedMusic);

    navigation.navigate('Home', {
      screen: 'NowPlaying',
      params: { trackId: track._id },
    });
  };

  const handleToggleLike = (trackId) => {
    toggleLike(trackId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={styles.container}>
        <Text style={styles.header}>Favourites</Text>
        <FlatList
          data={likedMusic}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.musicItem}>
              <TouchableOpacity
                onPress={() => handleSongPress(item)}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                {item.coverArt ? (
                  <Image
                    source={{ uri: `${STATIC_BASE_URL}/uploads/covers/${item.coverArt}` }}
                    style={styles.coverImage}
                  />
                ) : (
                  <View style={styles.coverPlaceholder} />
                )}
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.artist}>{item.artist}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleToggleLike(item._id)}>
                <Ionicons
                  name={playbackLikedMusic.includes(item._id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={playbackLikedMusic.includes(item._id) ? '#1DB954' : '#ccc'}
                />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Now Playing Bar */}
      {currentTrack && (
        <Pressable
          onPress={() =>
            navigation.navigate('Home', {
              screen: 'NowPlaying',
              params: { trackId: currentTrack._id },
            })
          }
          style={styles.nowPlayingBar}
        >
          {currentTrack.coverArt ? (
            <Image
              source={{ uri: `${STATIC_BASE_URL}/uploads/covers/${currentTrack.coverArt}` }}
              style={styles.coverImageNowPlaying}
            />
          ) : (
            <View style={styles.coverPlaceholderNowPlaying} />
          )}

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <TouchableOpacity onPress={() => handleToggleLike(currentTrack._id)} style={{ marginRight: 10 }}>
            <Ionicons
              name={playbackLikedMusic.includes(currentTrack._id) ? 'heart' : 'heart-outline'}
              size={28}
              color={playbackLikedMusic.includes(currentTrack._id) ? '#1DB954' : '#ccc'}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={previousTrack} style={styles.iconButton}>
            <Ionicons name="play-skip-back" size={32} color="#1DB954" />
          </TouchableOpacity>
          {isPlaying ? (
            <TouchableOpacity onPress={pauseTrack} style={styles.iconButton}>
              <Ionicons name="pause-circle" size={48} color="#1DB954" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={resumeTrack} style={styles.iconButton}>
              <Ionicons name="play-circle" size={48} color="#1DB954" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={nextTrack} style={styles.iconButton}>
            <Ionicons name="play-skip-forward" size={32} color="#1DB954" />
          </TouchableOpacity>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#121212', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color:'#1DB954', marginBottom: 20 },
  musicItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 12, 
    backgroundColor: '#222', 
    borderRadius: 8, 
    marginBottom: 10 
  },
  coverImage: { width: 50, height: 50, borderRadius: 6 },
  coverPlaceholder: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#444' },
  infoContainer: { marginLeft: 12, flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1DB954' },
  artist: { fontSize: 13, color: '#ccc' },
  nowPlayingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#181818',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  coverImageNowPlaying: { width: 48, height: 48, borderRadius: 6 },
  coverPlaceholderNowPlaying: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#444' },
  nowPlayingTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  nowPlayingArtist: { color: 'lightgray', fontSize: 14 },
  iconButton: { marginHorizontal: 10 },
});
