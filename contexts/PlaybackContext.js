import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { API_BASE_URL } from '../api';

const STATIC_BASE_URL = API_BASE_URL;
const PlaybackContext = createContext();

export function PlaybackProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isLoadingSound, setIsLoadingSound] = useState(false);

  const sound = useRef(new Audio.Sound());

  // Set volume
  useEffect(() => {
    if (sound.current) {
      sound.current.setVolumeAsync(volume);
    }
  }, [volume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  const playTrackAtIndex = async (index, tracks) => {
    if (isLoadingSound) {
      console.log('Skipping play request: sound still loading...');
      return;
    }

    if (index < 0 || index >= tracks.length) return;
    const track = tracks[index];
    setIsLoadingSound(true);

    try {
      // Stop & unload current sound safely
      await sound.current.stopAsync().catch(() => {});
      await sound.current.unloadAsync().catch(() => {});

      // Add tiny delay to avoid race condition
      await new Promise((res) => setTimeout(res, 150));

      // Load and play
      await sound.current.loadAsync(
        { uri: `${STATIC_BASE_URL}/uploads/music/${track.fileUrl}` },
        { shouldPlay: true, volume }
      );

      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
      setPlaylist(tracks);

      sound.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) nextTrack();
        }
      });
    } catch (e) {
      console.error('Playback error:', e);
    } finally {
      setIsLoadingSound(false);
    }
  };

  const playTrack = (track, tracks = playlist) => {
    const index = tracks.findIndex((t) => t._id === track._id);
    if (index !== -1) {
      playTrackAtIndex(index, tracks);
    } else {
      playTrackAtIndex(0, [track]);
    }
  };

  const pauseTrack = async () => {
    if (sound.current) {
      await sound.current.pauseAsync().catch(() => {});
      setIsPlaying(false);
    }
  };

  const resumeTrack = async () => {
    if (sound.current) {
      await sound.current.playAsync().catch(() => {});
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (!playlist.length) return;
    if (currentIndex + 1 < playlist.length) {
      playTrackAtIndex(currentIndex + 1, playlist);
    } else {
      console.log('Reached end of playlist');
    }
  };

  const previousTrack = () => {
    if (!playlist.length) return;
    if (currentIndex - 1 >= 0) {
      playTrackAtIndex(currentIndex - 1, playlist);
    } else {
      console.log('At beginning of playlist');
    }
  };

  return (
    <PlaybackContext.Provider
      value={{
        playlist,
        currentTrack,
        isPlaying,
        playTrack,
        pauseTrack,
        resumeTrack,
        nextTrack,
        previousTrack,
        setPlaylist,
        volume,
        setVolume,
        sound,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  return useContext(PlaybackContext);
}
