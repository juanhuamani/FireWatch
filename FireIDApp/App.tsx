/**
 * Fire ID - Sistema de Detección de Fuego IoT
 * Aplicación móvil para captura de foto y audio
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
