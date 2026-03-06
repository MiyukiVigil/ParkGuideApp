import { Color, Stack } from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';

// Theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32', // Nature Green
    secondary: '#FFA000', // Warning/Alert Gold
  }
};

export default function RootLayout() {
  return (
    <PaperProvider>
      <Stack />
    </PaperProvider>
  );
}