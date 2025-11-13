import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) dispatch({ type: 'LOGIN', token, user: null });
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
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
