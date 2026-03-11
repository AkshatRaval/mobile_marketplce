import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SW } = Dimensions.get("window");

interface CustomDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function CustomDialog({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: CustomDialogProps) {
  const [showModal, setShowModal] = useState(visible);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, scaleValue, opacityValue]);

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent statusBarTranslucent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]}>
          <Pressable style={styles.backdropPressable} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.dialogContainer,
            {
              opacity: opacityValue,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          {/* Header Icon */}
          <View style={[styles.iconBox, isDestructive ? styles.iconBoxDestructive : styles.iconBoxPrimary]}>
            <Ionicons
              name={isDestructive ? "alert-circle" : "information-circle"}
              size={32}
              color={isDestructive ? "#EF4444" : "#4F46E5"}
            />
          </View>

          {/* Texts */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isDestructive ? styles.confirmBtnDestructive : styles.confirmBtnPrimary]}
              onPress={() => {
                onConfirm();
                setTimeout(onCancel, 50); // Optional: auto close on press
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdropPressable: {
    flex: 1,
  },
  dialogContainer: {
    width: SW * 0.85,
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconBoxPrimary: {
    backgroundColor: "#EEF2FF",
  },
  iconBoxDestructive: {
    backgroundColor: "#FEF2F2",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmBtnPrimary: {
    backgroundColor: "#4F46E5",
    shadowColor: "#4F46E5",
  },
  confirmBtnDestructive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  confirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
});
