import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2F7D62",
    onPrimary: "#FFFFFF",
    primaryContainer: "#D7EEE2",
    onPrimaryContainer: "#123126",

    secondary: "#87A392",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#E2EEE7",
    onSecondaryContainer: "#1D3127",

    tertiary: "#C8A85C",
    onTertiary: "#2E240A",
    tertiaryContainer: "#F6E8BE",
    onTertiaryContainer: "#3D2E0C",

    background: "#EEF4EF",
    onBackground: "#1A2A21",

    surface: "#F7FAF7",
    onSurface: "#1A2A21",
    surfaceVariant: "#E3ECE5",
    onSurfaceVariant: "#55685D",

    outline: "#B1C1B7",
    outlineVariant: "#CFDAD2",

    error: "#BA4A3C",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD4",
    onErrorContainer: "#410002",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#4DAA7F",
    onPrimary: "#082016",
    primaryContainer: "#183628",
    onPrimaryContainer: "#CDECD9",

    secondary: "#90B89A",
    onSecondary: "#10261C",
    secondaryContainer: "#214737",
    onSecondaryContainer: "#DDEBDD",

    tertiary: "#D6B36A",
    onTertiary: "#2E2308",
    tertiaryContainer: "#4B3A11",
    onTertiaryContainer: "#F9E8BD",

    background: "#081912",
    onBackground: "#F4F7F2",

    surface: "#10261C",
    onSurface: "#F4F7F2",
    surfaceVariant: "#183628",
    onSurfaceVariant: "#B6CABC",

    outline: "#5C7668",
    outlineVariant: "#2C4A3B",

    error: "#D96C54",
    onError: "#2F0B04",
    errorContainer: "#47231B",
    onErrorContainer: "#FFD8CF",
  },
};

export const highContrastLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#000000",
    onPrimary: "#FFFFFF",
    primaryContainer: "#FFFFFF",
    onPrimaryContainer: "#000000",

    secondary: "#000000",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#FFFFFF",
    onSecondaryContainer: "#000000",

    tertiary: "#000000",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#FFFFFF",
    onTertiaryContainer: "#000000",

    background: "#FFFFFF",
    onBackground: "#000000",

    surface: "#FFFFFF",
    onSurface: "#000000",
    surfaceVariant: "#F2F2F2",
    onSurfaceVariant: "#111111",

    outline: "#000000",
    outlineVariant: "#000000",

    error: "#000000",
    onError: "#FFFFFF",
    errorContainer: "#FFFFFF",
    onErrorContainer: "#000000",
  },
};

export const highContrastDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#FFFFFF",
    onPrimary: "#000000",
    primaryContainer: "#000000",
    onPrimaryContainer: "#FFFFFF",

    secondary: "#FFFFFF",
    onSecondary: "#000000",
    secondaryContainer: "#000000",
    onSecondaryContainer: "#FFFFFF",

    tertiary: "#FFFFFF",
    onTertiary: "#000000",
    tertiaryContainer: "#000000",
    onTertiaryContainer: "#FFFFFF",

    background: "#000000",
    onBackground: "#FFFFFF",

    surface: "#000000",
    onSurface: "#FFFFFF",
    surfaceVariant: "#111111",
    onSurfaceVariant: "#FFFFFF",

    outline: "#FFFFFF",
    outlineVariant: "#FFFFFF",

    error: "#FFFFFF",
    onError: "#000000",
    errorContainer: "#000000",
    onErrorContainer: "#FFFFFF",
  },
};