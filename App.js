import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlaybackProvider } from './contexts/PlaybackContext';

import LoginScreen from './screens/LoginScreen';
import MusicListScreen from './screens/MusicListScreen';
import NowPlayingScreen from './screens/NowPlayingScreen';
import PlaylistScreen from './screens/PlaylistScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator for the Music section (to allow navigation from MusicList to NowPlaying)
function MusicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MusicList" component={MusicListScreen} />
      <Stack.Screen name="NowPlaying" component={NowPlayingScreen} />
    </Stack.Navigator>
  );
}

// Main app navigator with auth check
function AppNavigator() {
  const { userToken } = useAuth();

  if (!userToken) {
    // If not logged in, show only LoginScreen in stack
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Authenticated user: show bottom tabs
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#ccc',
          tabBarStyle: { backgroundColor: '#121212' },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            else if (route.name === 'Playlists') iconName = focused ? 'list' : 'list-outline';
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={MusicStack} />
        <Tab.Screen name="Playlists" component={PlaylistScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlaybackProvider>
        <AppNavigator />
      </PlaybackProvider>
    </AuthProvider>
  );
}
