import { useAuth } from "@/src/context/AuthContext";
import { profileApi } from "@/src/services/api/profileApi";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SalesLogs() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [editSoldPrice, setEditSoldPrice] = useState("");
  const [editBuyerName, setEditBuyerName] = useState("");
  const [editBuyerPhone, setEditBuyerPhone] = useState("");
  const [editIMEI, setEditIMEI] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    if (!user?.id) return;
    try {
      const data = await profileApi.getSalesLogs(user.id);
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // Open Edit Modal
  const handleEditLog = (log: any) => {
    setSelectedLog(log);
    setEditSoldPrice(log.sold_price?.toString() || "");
    setEditBuyerName(log.buyer_name || "");
    setEditBuyerPhone(log.buyer_phone || "");
    setEditIMEI(log.imei || "");
    setIsEditModalVisible(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!selectedLog) return;
    setUpdating(true);

    try {
      await profileApi.updateSalesLog(selectedLog.id, {
        sold_price: editSoldPrice,
        buyer_name: editBuyerName,
        buyer_phone: editBuyerPhone,
        imei: editIMEI,
      });

      setIsEditModalVisible(false);
      Alert.alert("Success", "Sales log updated successfully");
      fetchLogs();
    } catch (error) {
      console.error("Error updating log:", error);
      Alert.alert("Error", "Failed to update log");
    } finally {
      setUpdating(false);
    }
  };

  // Generate HTML for All Logs
  const generateBulkHtml = (data: any[]) => {
    const totalRevenue = data.reduce((sum, item) => {
      const price = parseFloat(item.sold_price) || 0;
      return sum + price;
    }, 0);

    const rows = data
      .map(
        (item) => `
      <tr>
        <td style="color: #64748b;">${new Date(item.sold_at).toLocaleDateString()}</td>
        <td>
            <div class="product-name">${item.product_name}</div>
            <div class="badge ${item.sale_type === "fast" ? "badge-fast" : "badge-detailed"}">
                ${item.sale_type === "fast" ? "⚡ Fast Sale" : "📝 Detailed"}
            </div>
            ${item.edited_at ? '<div class="badge badge-edited">✏️ Edited</div>' : ""}
        </td>
        <td>${item.buyer_name || "<span style='color:#cbd5e1'>-</span>"}</td>
        <td>${item.buyer_phone || "<span style='color:#cbd5e1'>-</span>"}</td>
        <td class="price">₹${item.sold_price}</td>
      </tr>
    `
      )
      .join("");

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page { margin: 20px; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #334155;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
            }
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 20px;
            }
            .report-title h1 { margin: 0; color: #0f172a; font-size: 28px; letter-spacing: -0.5px; }
            .report-title p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            .meta-info { text-align: right; }
            .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold; }
            .meta-value { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th {
                background-color: #f8fafc;
                color: #475569;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 12px 16px;
                text-align: left;
                border-bottom: 2px solid #e2e8f0;
            }
            td {
                padding: 16px;
                font-size: 13px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .product-name { font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 4px; }
            .price { font-weight: 700; color: #0f172a; font-size: 14px; text-align: right; }
            th:last-child { text-align: right; }
            .badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                margin-right: 4px;
            }
            .badge-fast { background-color: #fffbeb; color: #b45309; }
            .badge-detailed { background-color: #f0f9ff; color: #0369a1; }
            .badge-edited { background-color: #fef3c7; color: #92400e; }
            .total-row td {
                border-top: 2px solid #0f172a;
                border-bottom: none;
                padding-top: 20px;
            }
            .total-label {
                text-align: right;
                font-size: 14px;
                font-weight: bold;
                color: #64748b;
                text-transform: uppercase;
            }
            .total-amount {
                text-align: right;
                font-size: 20px;
                font-weight: 900;
                color: #0f172a;
            }
            .footer-note {
                margin-top: 50px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px dashed #e2e8f0;
                padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="report-title">
                <h1>Sales Report</h1>
                <p>Detailed transaction history</p>
            </div>
            <div class="meta-info">
                <div class="meta-label">Generated On</div>
                <div class="meta-value">${new Date().toLocaleDateString()}</div>
                <div class="meta-label">Total Items</div>
                <div class="meta-value">${data.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date</th>
                <th style="width: 35%">Item Details</th>
                <th style="width: 20%">Buyer</th>
                <th style="width: 15%">Contact</th>
                <th style="width: 15%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="3"></td>
                <td class="total-label">Total Revenue</td>
                <td class="total-amount">₹${totalRevenue.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer-note">
            This is a computer-generated document. No signature is required.
          </div>
        </body>
      </html>
    `;
  };

  // Generate HTML for Single Item Invoice
  const generateSingleInvoiceHtml = (item: any) => {
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page { margin: 20px; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #334155;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
            }
            .invoice-header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #0f172a;
                padding-bottom: 20px;
            }
            .invoice-header h1 { margin: 0; font-size: 32px; color: #0f172a; }
            .invoice-header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            .info-section {
                margin-bottom: 30px;
                padding: 20px;
                background-color: #f8fafc;
                border-radius: 8px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .info-value { font-weight: 600; color: #0f172a; font-size: 14px; }
            .price-section {
                margin-top: 40px;
                padding: 30px;
                background-color: #0f172a;
                color: white;
                text-align: center;
                border-radius: 8px;
            }
            .price-label { font-size: 14px; opacity: 0.8; margin-bottom: 10px; }
            .price-value { font-size: 36px; font-weight: 900; }
            .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .badge-edited { background-color: #fef3c7; color: #92400e; }
            .footer-note {
                margin-top: 50px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px dashed #e2e8f0;
                padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <p>Transaction Record ${item.edited_at ? '<span class="badge badge-edited">✏️ Edited</span>' : ""}</p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Product Name</span>
              <span class="info-value">${item.product_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sale Date</span>
              <span class="info-value">${new Date(item.sold_at).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sale Type</span>
              <span class="info-value">${item.sale_type === "fast" ? "⚡ Fast Sale" : "📝 Detailed Sale"}</span>
            </div>
            ${item.buyer_name
        ? `<div class="info-row">
              <span class="info-label">Buyer Name</span>
              <span class="info-value">${item.buyer_name}</span>
            </div>`
        : ""
      }
            ${item.buyer_phone
        ? `<div class="info-row">
              <span class="info-label">Buyer Contact</span>
              <span class="info-value">${item.buyer_phone}</span>
            </div>`
        : ""
      }
            ${item.imei
        ? `<div class="info-row">
              <span class="info-label">IMEI / Serial</span>
              <span class="info-value">${item.imei}</span>
            </div>`
        : ""
      }
            ${item.original_price
        ? `<div class="info-row">
              <span class="info-label">Original Price</span>
              <span class="info-value">₹${item.original_price}</span>
            </div>`
        : ""
      }
          </div>

          <div class="price-section">
            <div class="price-label">TOTAL AMOUNT</div>
            <div class="price-value">₹${parseFloat(item.sold_price).toLocaleString("en-IN")}</div>
          </div>

          <div class="footer-note">
            Generated on ${new Date().toLocaleDateString()} • This is a computer-generated invoice.
          </div>
        </body>
      </html>
    `;
  };

  // Export All as PDF
  const handleExportBulkPDF = async () => {
    if (logs.length === 0) {
      Alert.alert("No Data", "There are no sales records to export.");
      return;
    }

    setExporting(true);
    try {
      const html = generateBulkHtml(logs);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("PDF Export failed:", error);
      Alert.alert("Error", "Failed to generate PDF.");
    } finally {
      setExporting(false);
    }
  };

  // Export Single Invoice
  const handleExportSinglePDF = async (item: any) => {
    try {
      const html = generateSingleInvoiceHtml(item);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Single PDF Export failed:", error);
      Alert.alert("Error", "Failed to generate invoice.");
    }
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const dateString = item.sold_at
      ? new Date(item.sold_at).toDateString()
      : new Date().toDateString();

    return (
      <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-100">
        <View className="flex-row items-center">
          <Image
            source={{
              uri: item.product_image || "https://via.placeholder.com/150",
            }}
            className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200"
          />

          <View className="flex-1 ml-4">
            <Text
              className="text-gray-900 font-bold text-base"
              numberOfLines={1}
            >
              {item.product_name || "Unknown Product"}
            </Text>

            <View className="flex-row items-center mt-1">
              <Text className="text-gray-500 text-xs mr-2">Sold for:</Text>
              <Text className="text-green-600 font-black text-sm">
                ₹{item.sold_price}
              </Text>
              {item.original_price && (
                <Text className="text-gray-400 text-xs line-through ml-2">
                  ₹{item.original_price}
                </Text>
              )}
            </View>

            <View className="flex-row items-center mt-1 gap-1">
              <Text className="text-gray-400 text-[10px] uppercase font-bold">
                {dateString} •{" "}
                {item.sale_type === "fast" ? "⚡ Fast" : "📝 Detailed"}
              </Text>
              {item.edited_at && (
                <View className="bg-yellow-100 px-1.5 py-0.5 rounded">
                  <Text className="text-yellow-700 text-[9px] font-bold">
                    ✏️ EDITED
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row gap-2">
            {/* Invoice Button */}
            <TouchableOpacity
              onPress={() => handleExportSinglePDF(item)}
              className="bg-gray-100 p-2 rounded-lg"
            >
              <Ionicons name="document-text-outline" size={18} color="#374151" />
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity
              onPress={() => handleEditLog(item)}
              className="bg-indigo-50 p-2 rounded-lg"
            >
              <Ionicons name="create-outline" size={18} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-900">
            Sales History
          </Text>
        </View>

        {/* Bulk PDF Export Button */}
        <TouchableOpacity
          onPress={handleExportBulkPDF}
          disabled={exporting || logs.length === 0}
          className="bg-black p-2 rounded-lg"
        >
          {exporting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="download-outline" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="black" />
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-40">
          <Ionicons name="receipt-outline" size={64} color="gray" />
          <Text className="text-gray-500 font-bold mt-4">
            No Sales Recorded Yet
          </Text>
        </View>
      ) : (
        <FlashList
          data={logs}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderLogItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* EDIT MODAL */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 max-h-[85%]">
            <Text className="text-xl font-black text-center mb-6">
              Edit Sales Log
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Sold Price (₹)
              </Text>
              <TextInput
                value={editSoldPrice}
                onChangeText={setEditSoldPrice}
                keyboardType="numeric"
                className="bg-gray-100 p-4 rounded-xl font-bold mb-4"
                placeholder="Final amount"
              />

              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Buyer Name
              </Text>
              <TextInput
                value={editBuyerName}
                onChangeText={setEditBuyerName}
                className="bg-gray-100 p-4 rounded-xl font-bold mb-4"
                placeholder="Buyer name"
              />

              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Buyer Phone
              </Text>
              <TextInput
                value={editBuyerPhone}
                onChangeText={setEditBuyerPhone}
                keyboardType="phone-pad"
                className="bg-gray-100 p-4 rounded-xl font-bold mb-4"
                placeholder="Contact number"
              />

              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                IMEI / Serial No.
              </Text>
              <TextInput
                value={editIMEI}
                onChangeText={setEditIMEI}
                className="bg-gray-100 p-4 rounded-xl font-bold mb-6"
                placeholder="Device IMEI or Serial"
              />
            </ScrollView>

            <View className="flex-row gap-4 mt-2">
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
              >
                <Text className="font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={updating}
                className="flex-1 bg-black py-3 rounded-xl items-center"
              >
                {updating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}