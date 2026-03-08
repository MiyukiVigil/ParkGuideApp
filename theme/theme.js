import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const brand = {
  primary: '#2E7D32',
  progressBar: '#FFD700',
  percentageText: '#FFD700'
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    ...brand,

    primaryContainer: '#E8F5E9',
    secondaryContainer: '#F1F8E9',

    surfaceVariant: '#F5F5F5',
    background: '#FBFBFB',

    onSurface: '#1A1A1A',
    onSurfaceVariant: '#757575',

    outline: '#E0E0E0',
    primaryIcon: '#2E7D32',

    onPrimary: '#FFFFFF',
    onBackgroundVariant: '#111111',
  }
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,

    ...brand,

    primaryContainer: '#1B5E20',
    secondaryContainer: '#2E7D32',

    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    background: '#121212',

    onSurface: '#FFFFFF',
    onSurfaceVariant: '#BDBDBD',

    outline: '#333333',
    primaryIcon: '#FFFFFF',

    onPrimary: '#FFFFFF',
    onBackgroundVariant: '#FFFFFF',
  }
};