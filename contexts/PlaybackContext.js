import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

const PlaybackContext = createContext();

export function PlaybackProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);  // volume state

  const sound = useRef(new Audio.Sound());

  useEffect(() => {
    // Set volume on sound instance whenever volume state changes
    if (sound.current) {
      sound.current.setVolumeAsync(volume);
    }
  }, [volume]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  const playTrackAtIndex = async (index, tracks) => {
    if (index < 0 || index >= tracks.length) return;
    const track = tracks[index];

    try {
      await sound.current.unloadAsync();
      await sound.current.loadAsync({ uri: `http://localhost:5000/uploads/music/${track.fileUrl}` });
      await sound.current.setVolumeAsync(volume);  // ensure volume is set on load
      await sound.current.playAsync();

      setIsPlaying(true);
      setCurrentTrack(track);
      setCurrentIndex(index);
      setPlaylist(tracks);

      sound.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            nextTrack();
          }
        }
      });
    } catch (e) {
      console.error('Playback error:', e);
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
      await sound.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumeTrack = async () => {
    if (sound.current) {
      await sound.current.playAsync();
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (currentIndex + 1 < playlist.length) {
      playTrackAtIndex(currentIndex + 1, playlist);
    }
  };

  const previousTrack = () => {
    if (currentIndex - 1 >= 0) {
      playTrackAtIndex(currentIndex - 1, playlist);
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
        setVolume, // exposing volume setter for slider
        sound
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  return useContext(PlaybackContext);
}
