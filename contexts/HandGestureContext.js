import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { View, Modal, Platform, StyleSheet, Text } from "react-native";
import { Camera } from "expo-camera";
import Canvas from "react-native-canvas";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const HandGestureContext = createContext();

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const FRAMES_TO_CONFIRM = 4;

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20]
];
const FINGER_TIP_IDS = [8, 12, 16, 20];

const HandGestureHelpers = {
  isFingerExtended: (lm, tipIndex) => {
    if (!lm || !lm[tipIndex] || !lm[tipIndex - 3]) return false;
    return lm[tipIndex].y < lm[tipIndex - 3].y - 0.03;
  },
  
  countExtendedFingers: (lm) =>
    FINGER_TIP_IDS.filter(tip => HandGestureHelpers.isFingerExtended(lm, tip)).length,
    
  isThumbFolded: (lm) => {
    if (!lm) return false;
    const tip = lm[4];
    const pip = lm[3];
    const mcp = lm[2];
    const foldedVertically = tip.y > pip.y - 0.03;
    const foldedHorizontally = tip.x > mcp.x;
    return foldedVertically && foldedHorizontally;
  },
  
  isPalmOpen: (lm) => {
    if (!lm) return false;
    const fourFingersExtended = FINGER_TIP_IDS.every(tip => lm[tip].y < lm[tip - 3].y - 0.03);
    const thumbExtended = !HandGestureHelpers.isThumbFolded(lm);
    return fourFingersExtended && thumbExtended;
  },
  
  isFist: (lm) => {
    if (!lm) return false;
    return HandGestureHelpers.countExtendedFingers(lm) === 0 && HandGestureHelpers.isThumbFolded(lm);
  },
  
  isThumbsUpImproved: (lm) => {
    if (!lm) return false;
    const thumbUp = lm[4].y < lm[2].y - 0.03;
    const areFingersCurled = FINGER_TIP_IDS.every(tip => lm[tip].y > lm[tip - 2].y - 0.05);
    return thumbUp && areFingersCurled;
  },
  
  drawConnectors: (ctx, landmarks, connections) => {
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * ctx.canvas.width, landmarks[start].y * ctx.canvas.height);
      ctx.lineTo(landmarks[end].x * ctx.canvas.width, landmarks[end].y * ctx.canvas.height);
      ctx.stroke();
    });
  },
  
  drawLandmarks: (ctx, landmarks) => {
    ctx.fillStyle = "#00FF00";
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
};

export function HandGestureProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [permission, setPermission] = useState(null);
  const [statusText, setStatusText] = useState("Model not loaded");
  const [currentAction, setCurrentAction] = useState("Waiting for gesture...");

  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const gestureHistoryRef = useRef([]);
  let WebcamComponent = null;

  // Dynamic webcam import for web
  const [Webcam, setWebcam] = useState(null);
  
  useEffect(() => {
    if (Platform.OS === "web") {
      import("react-webcam").then(mod => {
        setWebcam(() => mod.default);
      }).catch(console.error);
    }
  }, []);

  // Load model and permissions
  useEffect(() => {
    if (!isVisible) return;

    const initHandTracking = async () => {
      try {
        setStatusText("Loading model...");
        if (Platform.OS !== "web") {
          const p = await Camera.requestCameraPermissionsAsync();
          setPermission(p.status === "granted");
        } else {
          setPermission(true);
        }

        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
        const handLm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { 
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" 
          },
          runningMode: "video", 
          numHands: 1,
        });
        setHandLandmarker(handLm);
        setStatusText("Ready for gestures!");
      } catch (err) {
        console.error(err);
        setStatusText("Failed to load model");
      }
    };

    initHandTracking();
  }, [isVisible]);

  const processGestures = useCallback((results, callbacks) => {
    const lm = results?.landmarks?.[0];
    if (!lm) {
      gestureHistoryRef.current = [];
      return;
    }

    let detectedGesture = null;
    if (HandGestureHelpers.isPalmOpen(lm)) detectedGesture = "PALM_OPEN";
    else if (HandGestureHelpers.isFist(lm)) detectedGesture = "FIST";
    else if (HandGestureHelpers.isThumbsUpImproved(lm)) detectedGesture = "THUMBS_UP";
    else {
      const fingers = HandGestureHelpers.countExtendedFingers(lm);
      if (fingers >= 1 && fingers <= 4) detectedGesture = `FINGERS_${fingers}`;
    }

    if (detectedGesture) {
      gestureHistoryRef.current.push(detectedGesture);
      if (gestureHistoryRef.current.length > FRAMES_TO_CONFIRM) gestureHistoryRef.current.shift();
    } else {
      gestureHistoryRef.current = [];
    }

    if (gestureHistoryRef.current.length === FRAMES_TO_CONFIRM) {
      const allSame = gestureHistoryRef.current.every(g => g === gestureHistoryRef.current[0]);
      if (allSame) {
        const gesture = gestureHistoryRef.current[0];
        const actions = {
          PALM_OPEN: callbacks.onPalmOpen,
          FIST: callbacks.onFist,
          THUMBS_UP: callbacks.onThumbsUp,
          "FINGERS_1": callbacks.onOneFinger,
          "FINGERS_2": callbacks.onTwoFingers,
          "FINGERS_3": callbacks.onThreeFingers,
          "FINGERS_4": callbacks.onFourFingers,
        };
        
        const action = actions[gesture];
        if (action) {
          action();
          setCurrentAction(`🎵 ${gesture}`);
        }
        gestureHistoryRef.current = [];
      }
    }
  }, []);

  const drawResults = useCallback(async (results) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = Platform.OS === "web" ? canvas.getContext("2d") : await canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results?.landmarks?.length) {
      results.landmarks.forEach(lm => {
        HandGestureHelpers.drawConnectors(ctx, lm, HAND_CONNECTIONS);
        HandGestureHelpers.drawLandmarks(ctx, lm);
      });
    }
  }, []);

  // Detection loops (web/mobile) - simplified for context
  useEffect(() => {
    if (!isVisible || !handLandmarker) return;
    
    // Add your detection loops here (webcam/mobile camera)
    // This is simplified - full implementation in modal render
  }, [isVisible, handLandmarker]);

  const value = {
    showGestures: () => setIsVisible(true),
    hideGestures: () => setIsVisible(false),
    isVisible,
    HandGestureModal: ({ callbacks }) => (
      <Modal visible={isVisible} animationType="slide" onRequestClose={value.hideGestures}>
        <View style={styles.container}>
          {/* Full camera/canvas implementation here */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.statusText}>Action: {currentAction}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={value.hideGestures}>
            <Text style={styles.closeButtonText}>Close Gestures</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  };

  return (
    <HandGestureContext.Provider value={value}>
      {children}
    </HandGestureContext.Provider>
  );
}

export function useHandGestures() {
  return useContext(HandGestureContext);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  statusContainer: { padding: 20, backgroundColor: "#111", alignItems: "center" },
  statusText: { color: "#fff", marginVertical: 5, fontSize: 16 },
  closeButton: {
    backgroundColor: "#1DB954",
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: "center"
  },
  closeButtonText: { color: "white", fontSize: 18, fontWeight: "bold" }
});
