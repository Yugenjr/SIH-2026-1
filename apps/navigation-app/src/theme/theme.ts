export const theme = {
  colors: {
    background: '#0B0F19', // Deep navy / near-black
    card: '#131B2E',
    cardBorder: '#233253',
    surfaceHeader: '#0F1626',
    
    // Status colors
    accent: '#00E5FF',      // Electric cyan for active navigation
    gnssHealthy: '#00E676', // Bright Green
    gnssDenied: '#FF3D00',  // Safety Red / Orange
    gnssRecovering: '#FFAB00', // Amber Yellow
    
    // Trajectory layer colors
    gnssPath: '#00E5FF',
    idrPath: '#FF9100',
    mapMatchedPath: '#00E676',
    
    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    
    // Button colors
    primaryButton: '#00E5FF',
    primaryButtonText: '#0B0F19',
    stopButton: '#FF3D00',
    stopButtonText: '#FFFFFF',
    secondaryButton: '#1B2640',
    secondaryButtonText: '#94A3B8',
    
    // Map graphics
    mapBackground: '#0D1322',
    mapGrid: '#18243C',
    roadMajor: '#2C3E66',
    roadMinor: '#1E2C4A',
    vehicleMarker: '#00E5FF',
    vehiclePulse: 'rgba(0, 229, 255, 0.25)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    pill: 9999,
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
    },
  },
};
