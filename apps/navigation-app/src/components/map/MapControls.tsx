import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
}) => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        onPress={onZoomIn}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        onPress={onZoomOut}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        onPress={onRecenter}
        activeOpacity={0.8}
      >
        <View style={[styles.targetRing, { borderColor: theme.colors.primary }]}>
          <View style={[styles.targetDot, { backgroundColor: theme.colors.primary }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    right: 10,
    zIndex: 15,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  targetRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
