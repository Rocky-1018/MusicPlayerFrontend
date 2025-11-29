import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { usePlayback } from '../contexts/PlaybackContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GestureRecognizer from 'react-native-swipe-gestures';
import { useMouseGestures } from '../contexts/MouseGestureContext'; 
import { API_BASE_URL } from '../api';

const STATIC_BASE_URL = API_BASE_URL;

const swipeConfig = {
  velocityThreshold: 0.1,
  directionalOffsetThreshold: 50,
  gestureIsClickThreshold: 5,
};

export default function NowPlayingScreen({ route }) {
  const { trackId } = route.params || {};
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
    sound,
    likedMusic,
    toggleLike,
  } = usePlayback();

  const { onMouseDown, onMouseUp, onMouseLeave } = useMouseGestures();

  const [track, setTrack] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    if (!trackId) return;

    const loadTrack = async () => {
      if (!currentTrack || currentTrack._id !== trackId) {
        try {
          const res = await fetch(`${STATIC_BASE_URL}/api/music/${trackId}`).then(r => r.json());
          setTrack(res);
          playTrack(res);
        } catch (err) {
          console.error('Error fetching track:', err);
        }
      } else {
        setTrack(currentTrack);
      }
    };

    loadTrack();
  }, [trackId]);

  useEffect(() => {
    if (currentTrack) {
      setTrack(currentTrack);
      setPosition(0);
      setDuration(0);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (track) setIsLiked(likedMusic.includes(track._id));
  }, [likedMusic, track]);

  useEffect(() => {
    if (!sound?.current) return;

    const onPlaybackStatusUpdate = (status) => {
      if (!status.isLoaded || status.didJustFinish) return;

      if (!isSeekingRef.current) {
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
      }
    };

    sound.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    return () => sound.current.setOnPlaybackStatusUpdate(null);
  }, [sound, currentTrack]);

  const handleToggleLike = async () => {
    if (!track) return;
    await toggleLike(track._id);
  };

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const onSeekSliderValueChange = (value) => {
    isSeekingRef.current = true;
    setPosition(value);
  };

  const onSeekSliderComplete = async (value) => {
    if (sound?.current) {
      try { await sound.current.setPositionAsync(value); } 
      catch (err) { console.error('Seek error:', err); }
    }
    isSeekingRef.current = false;
  };

  if (!track) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View 
        style={{ flex: 1 }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <View style={styles.container}>

          {/* Back Button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1DB954" />
          </TouchableOpacity>

          {/* Cover Art with Swipe */}
          <GestureRecognizer
            onSwipeLeft={nextTrack}
            onSwipeRight={previousTrack}
            config={swipeConfig}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={isPlaying ? pauseTrack : resumeTrack}
            >
              {track.coverArt ? (
                <Image
                  source={{
                    uri: track.coverArt.startsWith('http')
                      ? track.coverArt
                      : `${STATIC_BASE_URL}/uploads/covers/${track.coverArt}`,
                  }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder} />
              )}
            </TouchableOpacity>
          </GestureRecognizer>

          {/* Track Info */}
          <View style={styles.trackInfoContainer}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist || 'Unknown Artist'}</Text>
          </View>

          {/* Seek Slider */}
          <View style={styles.sliderRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(duration || 1, 1)}
              value={Math.min(position || 0, duration || 1)}
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
            <TouchableOpacity onPress={previousTrack}>
              <Ionicons name="play-skip-back" size={36} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity onPress={isPlaying ? pauseTrack : resumeTrack} style={styles.playPauseButton}>
              <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={70} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextTrack}>
              <Ionicons name="play-skip-forward" size={36} color="#1DB954" />
            </TouchableOpacity>
          </View>

          {/* Volume & Like */}
          <View style={styles.volumeLikeRow}>
            <View style={styles.volumeWrapper}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={isNaN(volume) ? 0.5 : Math.max(0, Math.min(1, volume))}
                minimumTrackTintColor="#1DB954"
                maximumTrackTintColor="#555"
                thumbTintColor="#1DB954"
                onValueChange={(value) => setVolume(Math.max(0, Math.min(1, value)))}
              />
            </View>
            <TouchableOpacity onPress={handleToggleLike} style={styles.likeButton}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={32} color={isLiked ? '#1DB954' : '#ccc'} />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const commonCoverStyle = {
  width: 350,
  height: 350,
  borderRadius: 20,
  backgroundColor: '#333',
  marginBottom: 5,
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#121212', alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 10 },
  coverImage: { ...commonCoverStyle },
  coverPlaceholder: { ...commonCoverStyle },
  trackInfoContainer: { width: '100%', marginTop: 15, marginBottom: 10, paddingHorizontal: 10 },
  title: { fontSize: 24, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  artist: { fontSize: 18, color: '#aaa', textAlign: 'center', marginTop: 4 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 20, paddingHorizontal: 20 },
  slider: { flex: 1, maxWidth: 300, minWidth: 250 },
  timeText: { color: '#ccc', fontSize: 14, fontWeight: '500', textAlign: 'center', minWidth: 45, flexShrink: 0 },
  controlsRow: { flexDirection: 'row', width: '80%', justifyContent: 'space-around', alignItems: 'center', marginVertical: 15 },
  playPauseButton: { paddingHorizontal: 15 },
  volumeLikeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, marginTop: 10 },
  volumeWrapper: { flex: 1, marginRight: 15 },
  volumeLabel: { fontSize: 16, color: '#ccc', marginBottom: 6, textAlign: 'left' },
  volumeSlider: { width: '100%', height: 40 },
  likeButton: { padding: 12, justifyContent: 'center', alignItems: 'center', minWidth: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  loading: { color: '#fff', fontSize: 16 },
});
