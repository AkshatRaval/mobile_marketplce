import React from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaViewProps,
} from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: React.ReactNode;
  bg?: string;
  style?: ViewStyle;
  edges?: SafeAreaViewProps["edges"];
}

/**
 * Device dimensions
 */
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } =
  Dimensions.get("window");

/**
 * Tablet breakpoint
 */
const IS_TABLET = DEVICE_WIDTH >= 768;

/**
 * App width logic:
 * - Phone → full width
 * - Tablet/Web → centered fixed width
 */
const APP_WIDTH = IS_TABLET ? 480 : DEVICE_WIDTH;

export default function ScreenWrapper({
  children,
  bg = "#ffffff",
  style,
  edges = ["top", "bottom"],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: bg }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        {/* Root layout container */}
        <View style={styles.root}>
          {/* App width container */}
          <View
            style={[
              styles.app,
              { width: APP_WIDTH, height: DEVICE_HEIGHT },
              style,
            ]}
          >
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  app: {
    flex: 1,
  },
});
