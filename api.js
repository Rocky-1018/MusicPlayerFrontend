import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api'; // Update with your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
