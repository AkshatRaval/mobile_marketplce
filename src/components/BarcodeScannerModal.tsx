import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

interface BarcodeScannerModalProps {
    visible: boolean;
    onScan: (value: string) => void;
    onClose: () => void;
    label?: string;
}

export function BarcodeScannerModal({
    visible,
    onScan,
    onClose,
    label = "Scan Barcode",
}: BarcodeScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScan(data);
        onClose();
        setTimeout(() => setScanned(false), 1000);
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{label}</Text>
                </View>

                {!permission?.granted ? (
                    <View style={styles.permBox}>
                        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.permText}>Camera permission required</Text>
                        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                            <Text style={styles.permBtnText}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e"] }}
                            onBarcodeScanned={handleBarCodeScanned}
                        />

                        {/* Scan overlay */}
                        <View style={styles.overlay}>
                            <View style={styles.scanFrame}>
                                {/* Corners */}
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                            <Text style={styles.hint}>Point camera at barcode / QR code</Text>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const FRAME = 240;
const CORNER = 24;
const BORDER = 4;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 10,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
    permBox: {
        flex: 1,
        backgroundColor: "#1F2937",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
    },
    permText: { color: "#9CA3AF", fontSize: 16, textAlign: "center" },
    permBtn: {
        backgroundColor: "#4F46E5",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
    permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    scanFrame: {
        width: FRAME,
        height: FRAME,
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: CORNER,
        height: CORNER,
        borderColor: "#A5B4FC",
        borderRadius: 4,
    },
    topLeft: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
    topRight: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
    hint: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        marginTop: 20,
        fontWeight: "500",
    },
});
