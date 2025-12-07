// Componente para mostrar el estado de conexión con el servidor

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, NEUMORPHIC, BORDER_RADIUS, SPACING, FONTS } from '../constants/theme';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isConnected, pulseAnim]);

  return (
    <View style={[styles.container, isConnected ? NEUMORPHIC.raised : NEUMORPHIC.flat]}>
      <Animated.View
        style={[
          styles.dot,
          { 
            backgroundColor: isConnected ? COLORS.success : COLORS.danger,
            transform: [{ scale: pulseAnim }]
          },
        ]}
      />
      <Text style={styles.text}>
        {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 9,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    ...FONTS.bold,
  },
});

export default ConnectionStatus;

