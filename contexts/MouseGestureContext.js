import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { usePlayback } from './PlaybackContext';
import { Platform } from 'react-native';

const MouseGestureContext = createContext();

export function MouseGestureProvider({ children }) {
  const {
    isPlaying,
    pauseTrack,
    resumeTrack,
    previousTrack,
    nextTrack,
  } = usePlayback();

  const clickTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const clickCountRef = useRef(0);
  const isMouseDownRef = useRef(false);

  const LONG_PRESS_DELAY = 600; 
  const DOUBLE_CLICK_WINDOW = 300; 

  
  const isMouseSupported = Platform.OS === 'web';

  const handleMouseDown = useCallback(() => {
    if (!isMouseSupported) return;
    
    isMouseDownRef.current = true;
    
    
    longPressTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current) {
        previousTrack();
        console.log('🖱️ GLOBAL Mouse: Previous Track (Long Press)');
        resetMouseState();
      }
    }, LONG_PRESS_DELAY);
  }, [previousTrack, isMouseSupported]);

  const handleMouseUp = useCallback(() => {
    if (!isMouseSupported) return;

    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;

   
    clearTimeout(longPressTimerRef.current);

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      
      clickTimerRef.current = setTimeout(() => {
        
        if (isPlaying) {
          pauseTrack();
          console.log('🖱️ GLOBAL Mouse: Pause');
        } else {
          resumeTrack();
          console.log('🖱️ GLOBAL Mouse: Play');
        }
        resetMouseState();
      }, DOUBLE_CLICK_WINDOW);
    } else if (clickCountRef.current === 2) {
      // Double click detected: Next Track
      clearTimeout(clickTimerRef.current);
      nextTrack();
      console.log('🖱️ GLOBAL Mouse: Next Track (Double Click)');
      resetMouseState();
    }
  }, [isPlaying, pauseTrack, resumeTrack, nextTrack, isMouseSupported]);

  const handleMouseLeave = useCallback(() => {
    if (!isMouseSupported) return;
    isMouseDownRef.current = false;
    clearTimeout(longPressTimerRef.current);
    clearTimeout(clickTimerRef.current);
  }, [isMouseSupported]);

  const resetMouseState = useCallback(() => {
    clearTimeout(clickTimerRef.current);
    clearTimeout(longPressTimerRef.current);
    clickCountRef.current = 0;
    isMouseDownRef.current = false;
  }, []);

  // Cleanup all timers
  useEffect(() => {
    return () => {
      clearTimeout(clickTimerRef.current);
      clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const value = {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    isMouseSupported,
  };

  return (
    <MouseGestureContext.Provider value={value}>
      {children}
    </MouseGestureContext.Provider>
  );
}

export function useMouseGestures() {
  return useContext(MouseGestureContext);
}
