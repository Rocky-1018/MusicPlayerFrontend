import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import api, { API_BASE_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATIC_BASE_URL = API_BASE_URL;
const PlaybackContext = createContext();

export function PlaybackProvider({ children }) {
  const { userToken } = useAuth(); // ✅ get token here
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isLoadingSound, setIsLoadingSound] = useState(false);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [likedMusic, setLikedMusic] = useState([]); // ✅ liked songs state

  const sound = useRef(new Audio.Sound());

  // -------------------
  // Helper functions
  // -------------------
  const unloadSoundSafely = useCallback(async () => {
    try {
      const status = await sound.current.getStatusAsync();
      if (status.isLoaded) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
      }
    } catch {}
  }, []);

  const pauseSoundSafely = useCallback(async () => {
    try {
      const status = await sound.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) await sound.current.pauseAsync();
    } catch {}
  }, []);

  const resumeSoundSafely = useCallback(async () => {
    try {
      const status = await sound.current.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) await sound.current.playAsync();
    } catch {}
  }, []);

  const safeSetVolume = useCallback((newVolume) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
  }, []);

  // -------------------
  // Playlist functions
  // -------------------
  const refreshPlaylist = async () => {
    if (isLoadingPlaylist) return;
    setIsLoadingPlaylist(true);
    try {
      const response = await api.get('/music', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setPlaylist(response.data);
    } catch (err) {
      console.error('Failed to refresh playlist:', err);
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  const fetchLikedMusic = async () => {
    if (!userToken) return;
    try {
      const res = await api.get('/auth/me/liked-music', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setLikedMusic(res.data.map(track => track._id));
    } catch (err) {
      console.error('Failed to fetch liked music:', err);
    }
  };

  const toggleLike = async (trackId) => {
    if (!userToken) return;

    const isCurrentlyLiked = likedMusic.includes(trackId);
    const newLikeStatus = !isCurrentlyLiked;

    // Optimistic UI update
    setLikedMusic(prev =>
      newLikeStatus ? [...prev, trackId] : prev.filter(id => id !== trackId)
    );

    try {
      if (newLikeStatus) {
        await api.post(`/auth/me/liked-music/${trackId}`, {}, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
      } else {
        await api.delete(`/auth/me/liked-music/${trackId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
      }
    } catch (err) {
      console.error('Failed to toggle like', err);
      // Revert on error
      setLikedMusic(prev =>
        isCurrentlyLiked ? [...prev, trackId] : prev.filter(id => id !== trackId)
      );
    }
  };

  // -------------------
  // Playback functions
  // -------------------
  const playTrackAtIndex = async (index, tracks) => {
    if (isLoadingSound) return;
    if (index < 0 || index >= tracks.length) return;

    const track = tracks[index];
    setIsLoadingSound(true);

    try {
      await unloadSoundSafely();
      await new Promise(res => setTimeout(res, 150));

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
    const index = tracks.findIndex(t => t._id === track._id);
    if (index !== -1) playTrackAtIndex(index, tracks);
    else playTrackAtIndex(0, [track]);
  };

  const pauseTrack = async () => { await pauseSoundSafely(); setIsPlaying(false); };
  const resumeTrack = async () => { await resumeSoundSafely(); setIsPlaying(true); };

  const nextTrack = () => {
    if (!playlist.length) return;
    if (currentIndex + 1 < playlist.length) playTrackAtIndex(currentIndex + 1, playlist);
  };

  const previousTrack = () => {
    if (!playlist.length) return;
    if (currentIndex - 1 >= 0) playTrackAtIndex(currentIndex - 1, playlist);
  };

  // -------------------
  // Effects
  // -------------------
  useEffect(() => { refreshPlaylist(); }, [userToken]);
  useEffect(() => { fetchLikedMusic(); }, [userToken]);
  useEffect(() => { return () => { unloadSoundSafely(); }; }, [unloadSoundSafely]);
  useEffect(() => {
    const setVolumeEffect = async () => {
      try {
        const status = await sound.current.getStatusAsync();
        if (status.isLoaded) await sound.current.setVolumeAsync(volume);
      } catch {}
    };
    setVolumeEffect();
  }, [volume]);

  // ✅ NEW: Stop music on logout (when userToken becomes null)
  useEffect(() => {
    if (!userToken && sound.current) {
      unloadSoundSafely();
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentIndex(-1);
    }
  }, [userToken, unloadSoundSafely]);

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
        refreshPlaylist,
        volume,
        setVolume: safeSetVolume,
        sound,
        isLoadingPlaylist,
        isLoadingSound,
        likedMusic,     
        toggleLike,     
        fetchLikedMusic, 
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  return useContext(PlaybackContext);
}
