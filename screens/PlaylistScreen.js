import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import api from '../api';

export default function PlaylistScreen() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    api.get('/playlist')
      .then(res => setPlaylists(res.data))
      .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Playlists</Text>
      <FlatList
        data={playlists}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <View style={styles.playlistItem}>
            <Text style={styles.playlistName}>{item.name}</Text>
            <Text style={styles.trackCount}>{item.tracks.length} tracks</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#121212', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color:'#1DB954', marginBottom: 20 },
  playlistItem: { padding: 15, backgroundColor: '#222', borderRadius: 8, marginBottom: 10 },
  playlistName: { fontSize: 18, color: 'white' },
  trackCount: { fontSize: 14, color: '#ccc', marginTop: 4 }
});
