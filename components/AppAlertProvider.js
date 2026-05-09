import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text, useTheme } from "react-native-paper";

const AppAlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

export function AppAlertProvider({ children }) {
  const theme = useTheme();
  const [alertState, setAlertState] = useState({
    visible: false,
    title: "",
    message: "",
    actions: [],
  });

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback((title, message, actions = []) => {
    setAlertState({
      visible: true,
      title: title || "",
      message: message || "",
      actions: Array.isArray(actions) && actions.length ? actions : [{ text: "OK" }],
    });
  }, []);

  const value = useMemo(() => ({ showAlert, hideAlert }), [hideAlert, showAlert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Portal>
        <Dialog
          visible={alertState.visible}
          onDismiss={hideAlert}
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Dialog.Title style={[styles.title, { color: theme.colors.onSurface }]}>
            {alertState.title}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
              {alertState.message}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <View style={styles.actions}>
              {alertState.actions.map((action, index) => (
                <Button
                  key={`${action.text || "action"}-${index}`}
                  mode={index === alertState.actions.length - 1 ? "contained" : "outlined"}
                  onPress={() => {
                    hideAlert();
                    action.onPress?.();
                  }}
                  style={styles.actionButton}
                >
                  {action.text || "OK"}
                </Button>
              ))}
            </View>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AppAlertContext.Provider>
  );
}

export const useAppAlert = () => useContext(AppAlertContext);

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    fontWeight: "800",
  },
  message: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    width: "100%",
  },
  actionButton: {
    minWidth: 88,
  },
});
