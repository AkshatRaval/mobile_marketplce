import { adminApi } from "@/src/services/api/adminApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DealerDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [dealer, setDealer] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            if (!id) return;

            const { dealer, inventory } = await adminApi.getDealerDetails(id as string);

            setDealer(dealer);
            setInventory(inventory);

        } catch (error: any) {
            Alert.alert("Error", "Could not load dealer details.");
            console.error(error);
            // Don't auto-back on error, let user see empty state or retry
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const toggleStatus = async () => {
        if (!dealer) return;
        const newStatus = dealer.status === "suspended" ? "active" : "suspended";

        Alert.alert(
            "Confirm Action",
            `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this dealer?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: newStatus === 'suspended' ? "destructive" : "default",
                    onPress: async () => {
                        try {
                            const updatedStatus = await adminApi.toggleDealerStatus(dealer.id, dealer.status);
                            setDealer({ ...dealer, status: updatedStatus });
                        } catch (e) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (!dealer) return (
        <View className="flex-1 justify-center items-center bg-gray-50">
            <Text className="text-gray-500">Dealer not found.</Text>
            <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3 bg-indigo-600 rounded-lg">
                <Text className="text-white font-bold">Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="font-black text-lg text-gray-900">Dealer Profile</Text>
                <View className="w-10" />
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Profile Card */}
                <View className="m-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 items-center">
                    <Image
                        source={{ uri: dealer.photo_url || `https://ui-avatars.com/api/?name=${dealer.display_name}&background=random&size=200` }}
                        className="w-24 h-24 rounded-full border-4 border-gray-50 mb-4"
                    />
                    <Text className="text-2xl font-black text-gray-900 text-center">{dealer.display_name}</Text>
                    <Text className="text-gray-500 font-medium mb-4">{dealer.shop_name || "No Shop Name"}</Text>

                    <View className={`px-4 py-1.5 rounded-full ${dealer.status === 'suspended' ? 'bg-red-100' : 'bg-green-100'}`}>
                        <Text className={`text-xs font-bold uppercase ${dealer.status === 'suspended' ? 'text-red-700' : 'text-green-700'}`}>
                            {dealer.status === 'suspended' ? 'Suspended Account' : 'Active Dealer'}
                        </Text>
                    </View>

                    <View className="flex-row mt-6 w-full justify-between px-4">
                        <View className="items-center flex-1">
                            <Text className="text-xl font-black text-gray-900">{inventory.length}</Text>
                            <Text className="text-xs font-bold text-gray-400 uppercase">Listings</Text>
                        </View>
                        <View className="w-[1px] bg-gray-200" />
                        <View className="items-center flex-1">
                            <Text className="text-xl font-black text-gray-900">{new Date(dealer.created_at).getFullYear()}</Text>
                            <Text className="text-xs font-bold text-gray-400 uppercase">Joined</Text>
                        </View>
                    </View>
                </View>

                {/* Contact Info */}
                <View className="mx-6 mb-6">
                    <Text className="text-sm font-bold text-gray-400 uppercase mb-3">Contact Details</Text>
                    <View className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-4">
                                <Ionicons name="mail" size={20} color="#4F46E5" />
                            </View>
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase">Email</Text>
                                <Text className="text-gray-900 font-medium">{dealer.email}</Text>
                            </View>
                        </View>
                        <View className="h-[1px] bg-gray-100" />
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-4">
                                <Ionicons name="call" size={20} color="#4F46E5" />
                            </View>
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase">Phone</Text>
                                <Text className="text-gray-900 font-medium">{dealer.phone || dealer.phone_number || "N/A"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Inventory */}
                <View className="mx-6 mb-6">
                    <Text className="text-sm font-bold text-gray-400 uppercase mb-3">Current Inventory ({inventory.length})</Text>
                    {inventory.length === 0 ? (
                        <View className="bg-white p-8 rounded-2xl items-center border border-gray-100">
                            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
                            <Text className="text-gray-400 font-bold mt-2">No active listings</Text>
                        </View>
                    ) : (
                        inventory.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => router.push(`/product/${item.id}`)}
                                activeOpacity={0.9}
                                style={{
                                    backgroundColor: 'white',
                                    padding: 14,
                                    borderRadius: 16,
                                    marginBottom: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 8,
                                    elevation: 3,
                                }}
                            >
                                <Image
                                    source={{ uri: item.images?.[0] }}
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 14,
                                        backgroundColor: '#F3F4F6',
                                    }}
                                    resizeMode="cover"
                                />
                                <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            fontWeight: '700',
                                            color: '#111827',
                                            fontSize: 15,
                                            letterSpacing: -0.2,
                                        }}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        style={{
                                            color: '#4F46E5',
                                            fontWeight: '800',
                                            fontSize: 15,
                                            marginTop: 4,
                                            letterSpacing: -0.3,
                                        }}
                                    >
                                        ₹{Number(item.price).toLocaleString()}
                                    </Text>
                                    {item.category && (
                                        <View
                                            style={{
                                                backgroundColor: '#F3F4F6',
                                                paddingHorizontal: 8,
                                                paddingVertical: 3,
                                                borderRadius: 6,
                                                alignSelf: 'flex-start',
                                                marginTop: 6,
                                            }}
                                        >
                                            <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '600' }}>
                                                {item.category}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 10,
                                        backgroundColor: '#F9FAFB',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        alignSelf: 'center',
                                    }}
                                >
                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

            </ScrollView>

            {/* Floating Action Button */}
            <View className="absolute bottom-6 left-6 right-6">
                <TouchableOpacity
                    onPress={toggleStatus}
                    className={`py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${dealer.status === 'suspended' ? 'bg-green-600' : 'bg-red-600'}`}
                >
                    <Ionicons name={dealer.status === 'suspended' ? "checkmark-circle" : "ban"} size={24} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-lg">
                        {dealer.status === 'suspended' ? "Unblock Dealer" : "Suspend Dealer"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
