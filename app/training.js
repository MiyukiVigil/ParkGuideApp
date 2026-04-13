import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";

export default function TrainingModule() {
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    router.replace("/courses");
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
