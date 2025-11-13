import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { usePlayback } from '../contexts/PlaybackContext';
import { useNavigation } from '@react-navigation/native';

export default function NowPlayingScreen({ route }) {
  const { trackId } = route.params;
  const navigation = useNavigation();

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    volume,
    setVolume,
    sound, // Received from PlaybackContext as a ref
  } = usePlayback();

  const [track, setTrack] = useState(null);
  const [position, setPosition] = useState(0); // in milliseconds
  const [duration, setDuration] = useState(0); // in milliseconds
  const isSeekingRef = useRef(false); // Track if user is currently scrubbing

  useEffect(() => {
    api
      .get(`/music/${trackId}`)
      .then((res) => setTrack(res.data))
      .catch(console.error);
  }, [trackId]);

  useEffect(() => {
    if (track) playTrack(track);
  }, [track]);

  useEffect(() => {
    if (!sound?.current) return;

    const onPlaybackStatusUpdate = (status) => {
      if (status.isLoaded && !isSeekingRef.current) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis || 0);
      }

      if (status.didJustFinish) {
        nextTrack();
      }
    };

    sound.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

    return () => {
      // Unsubscribe listener
      if (sound.current) sound.current.setOnPlaybackStatusUpdate(null);
    };
  }, [sound, nextTrack]);

  if (!track) return <Text style={styles.loading}>Loading...</Text>;

  // Format milliseconds to mm:ss
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const onSeekSliderValueChange = (value) => {
    // User started seeking
    isSeekingRef.current = true;
    setPosition(value);
  };

  const onSeekSliderComplete = async (value) => {
    // User finished seeking
    isSeekingRef.current = false;
    if (sound.current) {
      await sound.current.setPositionAsync(value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#1DB954" />
      </TouchableOpacity>

      {/* Cover Art */}
      {track.coverArt && (
        <Image
          source={{ uri: `http://localhost:5000/uploads/covers/${track.coverArt}` }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}

      {/* Title & Artist */}
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.artist}>{track.artist}</Text>

      {/* Playback Slider & Time */}
      <View style={styles.sliderRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#555"
          thumbTintColor="#1DB954"
          onValueChange={onSeekSliderValueChange}
          onSlidingComplete={onSeekSliderComplete}
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Playback Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={previousTrack} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={36} color="#1DB954" />
        </TouchableOpacity>

        {isPlaying ? (
          <TouchableOpacity onPress={pauseTrack} style={styles.controlButton}>
            <Ionicons name="pause-circle" size={64} color="#1DB954" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={resumeTrack} style={styles.controlButton}>
            <Ionicons name="play-circle" size={64} color="#1DB954" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={nextTrack} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={36} color="#1DB954" />
        </TouchableOpacity>
      </View>

      {/* Volume Slider */}
      <Text style={styles.volumeLabel}>Volume</Text>
      <Slider
      
  style={[styles.slider, { width: 250 }]} // or flex: 1, depending on layout
  minimumValue={0}
  maximumValue={1}
  value={volume}
  minimumTrackTintColor="#1DB954"
  maximumTrackTintColor="#555"
  thumbTintColor="#1DB954"
  onValueChange={setVolume}
/>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212', alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 10 },
  coverImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#333',
  },
  title: {
    fontSize: 24,
    color: '#1DB954',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  artist: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 20,
    textAlign: 'center',
  },
  loading: { marginTop: 100, color: 'white', fontSize: 16, textAlign: 'center' },

  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    width: 40,
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },

  controlsRow: {
    flexDirection: 'row',
    width: '80%',
    justifyContent: 'space-around',
    marginTop: 20,
    alignItems: 'center',
  },
  controlButton: { paddingHorizontal: 10 },

  volumeLabel: { marginTop: 30, fontSize: 16, color: '#ccc', textAlign: 'center' },
});
