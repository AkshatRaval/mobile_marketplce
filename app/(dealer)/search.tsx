import { db } from "@/FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- TYPES ---
interface Product {
  id: string;
  name: string;
  price: string;
  tags?: string[];
  description: string;
  images: string[];
  dealerName: string;
  city: string;
}

export default function SearchPage() {
  // State
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // To track if a search has been performed

  // --- SEARCH LOGIC ---
  const handleSearch = async () => {
    if (!searchText.trim()) return;

    Keyboard.dismiss(); // Hide keyboard
    setLoading(true);
    setHasSearched(true);
    setResults([]); // Clear previous results

    try {
      // NOTE: Firestore does not support 'contains' queries natively.
      // We fetch the list and filter in JS. This is efficient for < 1000 items.
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const filteredData: Product[] = [];
      const lowerQuery = searchText.toLowerCase();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const name = data.name ? data.name.toLowerCase() : "";
        const desc = data.description ? data.description.toLowerCase() : "";
        const dealer = data.dealerName ? data.dealerName.toLowerCase() : "";
        
        // Search in Name, Description, or Dealer Name
        if (name.includes(lowerQuery) || desc.includes(lowerQuery) || dealer.includes(lowerQuery)) {
          filteredData.push({
            id: doc.id,
            name: data.name,
            price: data.price,
            tags: data.tags || ["Verified"],
            description: data.description,
            images: data.images || [],
            dealerName: data.dealerName,
            city: data.city,
          });
        }
      });

      setResults(filteredData);

    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }: { item: Product }) => (
    <View className="bg-white rounded-2xl mb-4 border border-gray-100 shadow-sm overflow-hidden flex-row">
      {/* Thumbnail Image */}
      <View className="w-28 h-28 bg-gray-200">
        {item.images?.[0] ? (
          <Image 
            source={{ uri: item.images[0] }} 
            className="w-full h-full" 
            resizeMode="cover" 
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
             <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Details */}
      <View className="flex-1 p-3 justify-between">
         <View>
            <View className="flex-row justify-between items-start">
               <Text numberOfLines={2} className="text-gray-900 font-bold text-base flex-1 mr-2 leading-5">
                 {item.name}
               </Text>
               <View className="bg-indigo-50 px-2 py-1 rounded">
                  <Text className="text-indigo-600 font-bold text-xs">
                    ₹{item.price}
                  </Text>
               </View>
            </View>
            <Text numberOfLines={1} className="text-gray-500 text-xs mt-1">
               {item.description}
            </Text>
         </View>

         <View className="flex-row items-center mt-2">
            <Ionicons name="storefront-outline" size={12} color="#6B7280" />
            <Text numberOfLines={1} className="text-gray-500 text-xs ml-1 flex-1 font-medium">
               {item.dealerName}, {item.city}
            </Text>
         </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER & SEARCH BAR --- */}
      <View className="px-5 py-2 border-b border-gray-100 pb-4">
        <Text className="text-2xl font-black text-gray-900 mb-4 mt-2">Search</Text>
        
        <View className="flex-row items-center space-x-3">
          <View className="flex-1 bg-gray-100 rounded-xl flex-row items-center px-4 py-3 border border-gray-200 focus:border-indigo-500">
             <Ionicons name="search" size={20} color="#9CA3AF" />
             <TextInput
               className="flex-1 ml-3 text-gray-900 font-medium text-base"
               placeholder="Search phones, models..."
               placeholderTextColor="#9CA3AF"
               returnKeyType="search"
               value={searchText}
               onChangeText={setSearchText}
               onSubmitEditing={handleSearch} // Trigger search on keyboard 'Enter'
             />
             {searchText.length > 0 && (
               <TouchableOpacity onPress={() => setSearchText("")}>
                 <Ionicons name="close-circle" size={18} color="#9CA3AF" />
               </TouchableOpacity>
             )}
          </View>
          
          {/* Search Button */}
          <TouchableOpacity 
             onPress={handleSearch}
             className="bg-indigo-600 rounded-xl p-3.5 shadow-md active:bg-indigo-700"
          >
             <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- RESULTS AREA --- */}
      <View className="flex-1 bg-gray-50 px-5 pt-4">
        
        {loading ? (
          <View className="mt-20 items-center">
             <ActivityIndicator size="large" color="#4F46E5" />
             <Text className="text-gray-400 mt-4 text-sm font-medium">Searching...</Text>
          </View>
        ) : !hasSearched ? (
          // Initial State (No Search Yet)
          <View className="mt-20 items-center opacity-40">
             <Ionicons name="search-outline" size={80} color="#CBD5E1" />
             <Text className="text-gray-400 mt-4 font-medium text-center px-10">
               Enter a model name above and hit search to find results.
             </Text>
          </View>
        ) : results.length === 0 ? (
          // No Results Found
          <View className="mt-20 items-center">
             <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                <Ionicons name="alert-outline" size={40} color="#64748B" />
             </View>
             <Text className="text-gray-900 font-bold text-lg">No Results Found</Text>
             <Text className="text-gray-500 text-center mt-1 px-8">
               We couldn't find anything matching "{searchText}". Try a different keyword.
             </Text>
          </View>
        ) : (
          // Results List
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
               <Text className="text-gray-500 text-xs font-bold uppercase mb-4 ml-1">
                  Found {results.length} result{results.length !== 1 ? 's' : ''}
               </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}