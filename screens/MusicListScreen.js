import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { usePlayback } from '../contexts/PlaybackContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATIC_BASE_URL = API_BASE_URL;

export default function MusicListScreen({ navigation }) {
  const { logout } = useAuth();
  const {
    currentTrack,
    isPlaying,
    pauseTrack,
    resumeTrack,
    playTrack,
    setPlaylist,
    nextTrack,
    previousTrack,
    likedMusic,
    toggleLike,
  } = usePlayback(); // ✅ get likedMusic and toggleLike

  const [music, setMusic] = useState([]);
  const [filteredMusic, setFilteredMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [artistFilter, setArtistFilter] = useState('');

  useEffect(() => {
    api
      .get('/music')
      .then((res) => {
        setMusic(res.data);
        setFilteredMusic(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const filtered = music.filter((track) =>
      track.artist.toLowerCase().includes(artistFilter.toLowerCase())
    );
    setFilteredMusic(filtered);
  }, [artistFilter, music]);

  const handleSongPress = (track) => {
    setPlaylist(filteredMusic);
    playTrack(track, filteredMusic);
    navigation.navigate('NowPlaying', { trackId: track._id });
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#1DB954"
        style={{ flex: 1, justifyContent: 'center' }}
      />
    );
  }

  const renderItem = ({ item }) => {
    const isLiked = likedMusic.includes(item._id);

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity style={styles.item} onPress={() => handleSongPress(item)}>
          {item.coverArt ? (
            <Image
              source={{ uri: `${STATIC_BASE_URL}/uploads/covers/${item.coverArt}` }}
              style={styles.coverImageSmall}
            />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}
          <View style={styles.infoContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.artist}>{item.artist}</Text>
          </View>
        </TouchableOpacity>
        {/* Like button */}
        <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.likeButton}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#1DB954' : '#ccc'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Filter by artist"
            value={artistFilter}
            onChangeText={setArtistFilter}
            autoCapitalize="words"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#d9534f" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredMusic}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
        />
      </View>

      {currentTrack && (
        <Pressable
          onPress={() => navigation.navigate('NowPlaying', { trackId: currentTrack._id })}
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 80, // space for now playing bar
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#eee',
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  logoutButton: {
    padding: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  coverImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  coverPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  infoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    color: '#ccc',
    fontSize: 13,
  },
  likeButton: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
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
  coverImageNowPlaying: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  coverPlaceholderNowPlaying: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  nowPlayingTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nowPlayingArtist: {
    color: 'lightgray',
    fontSize: 14,
  },
  iconButton: {
    marginHorizontal: 10,
  },
});
