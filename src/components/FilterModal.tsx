import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ScrollView,
    Animated,
    Modal,
    StyleSheet,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import SelectionChip from "./SelectionChip";
import { GENRES, LANGUAGES, MOODS } from "../constants/filters";

const { width } = Dimensions.get("window");

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: () => void;
    types: string[];
    setTypes: (types: string[]) => void;
    genre: string[];
    setGenre: (genre: string[]) => void;
    language: string;
    setLanguage: (language: string) => void;
    mood: string;
    setMood: (mood: string) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    types,
    setTypes,
    genre,
    setGenre,
    language,
    setLanguage,
    mood,
    setMood,
}) => {
    const insets = useSafeAreaInsets();
    const translateX = useRef(new Animated.Value(width)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(translateX, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(translateX, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const handleApply = () => {
        Animated.timing(translateX, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onApply());
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <Animated.View
                    style={[
                        styles.animatedContent,
                        { transform: [{ translateX }] },
                    ]}
                >
                    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                    <LinearGradient
                        colors={["rgba(255,106,0,0.2)", "transparent"]}
                        style={styles.gradient}
                    />

                    <ScrollView
                        scrollEnabled={true}
                        style={{ flex: 1 }}
                        contentContainerStyle={[
                            styles.scrollContent,
                            Platform.OS === "ios"
                                ? { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 4 }
                                : { paddingTop: 16, paddingBottom: 30 }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.headerSection}>
                            <View style={styles.headerTitleRow}>
                                <Text style={styles.title}>
                                    What are you in the{"\n"}
                                    <Text style={styles.highlight}>mood for today?</Text>
                                </Text>
                                <TouchableOpacity
                                    onPress={handleClose}
                                    style={styles.closeButton}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <X color="#fff" size={24} />
                                </TouchableOpacity>
                                {/* <Text style={styles.subtitle}>
                                Personalize your feed by choosing your preferences below.
                            </Text> */}
                            </View>
                        </View>

                        <Text style={styles.sectionLabel}>Content Type</Text>
                        <View style={styles.chipRow}>
                            <SelectionChip
                                label="Movies"
                                selected={types.includes("movie")}
                                onPress={() => setTypes(types.includes("movie") ? types.filter(t => t !== "movie") : [...types, "movie"])}
                            />
                            <View style={{ width: 10 }} />
                            <SelectionChip
                                label="TV Shows"
                                selected={types.includes("tv")}
                                onPress={() => setTypes(types.includes("tv") ? types.filter(t => t !== "tv") : [...types, "tv"])}
                            />
                        </View>

                        <Text style={styles.sectionLabel}>Genre</Text>
                        <View style={styles.chipWrapRow}>
                            {GENRES.map((g) => (
                                <SelectionChip
                                    key={g.value}
                                    label={g.label}
                                    selected={genre.includes(g.value)}
                                    onPress={() => {
                                        const newGenres = genre.includes(g.value)
                                            ? genre.filter(v => v !== g.value)
                                            : [...genre, g.value];
                                        setGenre(newGenres);
                                    }}
                                />
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>Language</Text>
                        <View style={styles.chipWrapRow}>
                            {LANGUAGES.map((l) => (
                                <SelectionChip
                                    key={l.value}
                                    label={l.label}
                                    selected={language === l.value}
                                    onPress={() => setLanguage(l.value)}
                                />
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>Mood</Text>
                        <View style={styles.chipWrapRow}>
                            {MOODS.map((m) => (
                                <SelectionChip
                                    key={m.value}
                                    label={m.label}
                                    selected={mood === m.value}
                                    onPress={() => setMood(m.value)}
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={handleApply}
                            style={[
                                styles.applyButton,
                            ]}
                        >
                            <Text style={styles.applyButtonText}>
                                Apply & Recommend
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View >
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    animatedContent: {
        flex: 1,
        width: width,
        backgroundColor: "#000",
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
        opacity: 0.5,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    headerTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    closeButton: {
        padding: 10,
        marginTop: -4,
        marginRight: -4,
    },
    scrollContent: {
        padding: 16,
    },
    headerSection: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#fff",
        lineHeight: 34,
    },
    highlight: {
        color: "#FF6A00",
    },
    // subtitle: {
    //     marginTop: 12,
    //     color: "#888",
    //     fontSize: 16,
    // },
    sectionLabel: {
        color: "#aaa",
        fontSize: 14,
        fontWeight: "600",
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 20,
    },
    chipRow: {
        flexDirection: "row",
        marginTop: 10,
    },
    chipWrapRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 10,
    },
    applyButton: {
        marginTop: 32,
        backgroundColor: "#FF6A00",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#FF6A00",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    applyButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default FilterModal;
