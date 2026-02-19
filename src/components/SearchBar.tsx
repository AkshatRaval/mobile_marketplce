import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

// ✅ MEMOIZED - won't re-render unless props actually change
export const SearchBar = memo(
  ({ value, onChangeText, onClear }: SearchBarProps) => {
    // console.log("🟢 SEARCHBAR RENDERED, value:", value);

    useEffect(() => {
      // console.log("🟢 SEARCHBAR MOUNTED");
      return () => {
        // console.log("🔴 SEARCHBAR UNMOUNTED!!!");
      };
    }, []);

    return (
      <View className="bg-white px-6 pb-4">
        <View className="bg-gray-100 flex-row items-center px-4 py-2 rounded-2xl">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search your products..."
            className="flex-1 ml-3 font-bold text-gray-800 py-1"
            value={value}
            onChangeText={(text) => {
              // console.log("⌨️ TYPING:", text);
              onChangeText(text);
            }}
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {value !== "" && (
            <TouchableOpacity onPress={onClear}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    const areEqual = prevProps.value === nextProps.value;
    // console.log(
    //   "🔵 SEARCHBAR MEMO CHECK:",
    //   areEqual ? "SKIP RENDER" : "WILL RENDER",
    // );
    return areEqual;
  },
);

SearchBar.displayName = "SearchBar";
