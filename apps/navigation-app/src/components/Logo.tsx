import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 36 }) => {
  const innerSize = size * 0.5;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer sensor orbit ring */}
      <View
        style={[
          styles.orbitRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: theme.colors.accent,
          },
        ]}
      />
      {/* Inner gyro ring */}
      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: (size * 0.75) / 2,
            borderColor: 'rgba(0, 229, 255, 0.4)',
          },
        ]}
      />
      {/* Stylized navigation arrow */}
      <View style={[styles.arrowContainer, { width: innerSize, height: innerSize }]}>
        <View style={styles.arrowHead} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.accent,
    transform: [{ translateY: -2 }],
  },
});
