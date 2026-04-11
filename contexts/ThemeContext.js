import React, { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

export function useThemeContext() {
    return useContext(ThemeContext);
}