import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const initialState = { userToken: null, user: null };
const AuthContext = createContext();

function reducer(state, action) {
  switch(action.type) {
    case 'LOGIN':
      return { ...state, userToken: action.token, user: action.user };
    case 'LOGOUT':
      return { userToken: null, user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true); // Splash/loading state

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          // Verify token by calling backend
          await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          dispatch({ type: 'LOGIN', token, user: null });
        } catch {
          await AsyncStorage.removeItem('userToken');
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (token, user) => {
    await AsyncStorage.setItem('userToken', token);
    dispatch({ type: 'LOGIN', token, user });
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
