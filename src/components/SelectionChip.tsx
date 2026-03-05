import React from "react";
import { TouchableOpacity, Text } from "react-native";

const SelectionChip = ({ label, selected, onPress }: any) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
                backgroundColor: selected ? "#FF6A00" : "#222",
            }}
        >
            <Text style={{ color: "#fff", fontSize: 14 }}>{label}</Text>
        </TouchableOpacity>
    );
};

export default SelectionChip;

