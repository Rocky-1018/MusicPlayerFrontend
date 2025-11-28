import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onLogin() {
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, null);
    } catch {
      setError('Invalid email or password');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gesture Music Player</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={onLogin} />

      {/* Sign Up Button */}
      <TouchableOpacity
        style={styles.signupButton}
        onPress={() => navigation.navigate('Signup')} 
      >
        <Text style={styles.signupButtonText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20, backgroundColor: '#121212' },
  title: { fontSize: 26, marginBottom: 20, color:'#1DB954', fontWeight:'bold', textAlign:'center' },
  input: { backgroundColor:'#222', color:'#eee', marginBottom:15, padding:12, borderRadius:8 },
  error: { color:'red', marginBottom:12, textAlign:'center' },
  signupButton: { marginTop: 20, alignItems: 'center' },
  signupButtonText: { color: '#1DB954', fontSize: 16 },
});
