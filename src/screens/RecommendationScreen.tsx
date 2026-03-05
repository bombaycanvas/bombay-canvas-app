import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Image,
    ActivityIndicator,
    Linking,
    StatusBar,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlidersHorizontal, Play } from "lucide-react-native";

import FilterModal from "../components/FilterModal";
import { getRecommendations, getContentDetails } from "../api/recommendation";
import { trackEvent } from "../api/events";

const { width, height } = Dimensions.get("window");

const HEADER_HEIGHT = 56;
const TAB_BAR_HEIGHT = 70;
const CARD_HEIGHT = height - HEADER_HEIGHT - TAB_BAR_HEIGHT;

/* ---------------- TYPES ---------------- */
type RecommendationItem = {
    id: string | number;
    title: string;
    overview: string;
    poster?: string;
    rating?: number;
    language?: string;
    year?: number;
    type?: string; // movie | tv | internal
};

const RecommendationScreen = () => {
    const insets = useSafeAreaInsets();
    const [types, setTypes] = useState<string[]>(["movie"]);
    const [genre, setGenre] = useState("action");
    const [language, setLanguage] = useState("english");
    const [mood, setMood] = useState("excited");

    const [data, setData] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [detailsMap, setDetailsMap] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [isPreferencesVisible, setIsPreferencesVisible] = useState(false);

    const openModal = () => {
        setIsPreferencesVisible(true);
    };

    const closeModal = () => {
        setIsPreferencesVisible(false);
    };

    const viewStartTime = useRef<number>(Date.now());
    const currentItemId = useRef<string | number | null>(null);

    const fetchDetails = useCallback(async (item: RecommendationItem) => {
        const key = item.id.toString();

        if (detailsMap[key]) return;

        try {
            setLoadingDetails(key);

            const cleanId =
                typeof item.id === "string" && item.id.startsWith("internal-")
                    ? item.id.replace("internal-", "")
                    : item.id.toString();

            const res = await getContentDetails(item.type || "movie", cleanId);
            setDetailsMap((prev) => ({
                ...prev,
                [key]: res,
            }));
        } catch (err) {
            console.log("Details error:", err);
        } finally {
            setLoadingDetails(null);
        }
    }, [detailsMap]);

    const fetchRecommendations = async (reset = false) => {
        if (loading) return;

        try {
            if (reset) {
                setData([]);
                closeModal();
            }
            setLoading(true);

            const res = await getRecommendations({
                userId: "user_001",
                types,
                genre,
                language,
                mood,
                page: reset ? 1 : page,
                limit: 10,
            });

            const newData: RecommendationItem[] = res.data || [];

            setData((prev) => (reset ? newData : [...prev, ...newData]));
            setHasMore(res.hasMore);
            setPage((p) => (reset ? 2 : p + 1));
        } catch (err) {
            console.error("Recommendation error:", err);
        } finally {
            setLoading(false);
        }
    };

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: any[] }) => {
            if (!viewableItems || viewableItems.length === 0) return;

            const item: RecommendationItem = viewableItems[0].item;
            fetchDetails(item);

            const now = Date.now();

            if (currentItemId.current) {
                const duration = (now - viewStartTime.current) / 1000;

                trackEvent({
                    userId: "user_001",
                    contentId: currentItemId.current,
                    event: duration >= 5 ? "watch_time" : "skip",
                    duration,
                });
            }

            currentItemId.current = item.id;
            viewStartTime.current = now;
        },
        [fetchDetails]
    );

    useEffect(() => {
        if (data.length === 0) {
            fetchRecommendations(true);
        }
    }, []);


    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: height,
            offset: height * index,
            index,
        }),
        []
    );

    const renderItem = useCallback(
        ({ item }: { item: RecommendationItem }) => {
            const details = detailsMap[item.id.toString()];

            console.log("Recommendation Item:", item);
            console.log("Item Details:", details);

            return (
                <View
                    style={[
                        styles.itemContainer,
                        { paddingTop: insets.top + 60 }
                    ]}
                >
                    <View style={styles.posterContainer}>
                        {item.poster && (
                            <Image
                                source={{ uri: item.poster }}
                                style={styles.poster}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.title}>
                            {item.title}
                        </Text>

                        <Text style={styles.rating}>
                            ⭐ {item.rating ?? "N/A"} • {item.language?.toUpperCase()} •{" "}
                            {item.year ?? "—"}
                            {details?.runtime ? ` • ${details.runtime} min` : ""}
                        </Text>

                        {details?.genres && (
                            <Text style={styles.genresText}>
                                {details.genres.map((g: any) => typeof g === 'string' ? g : g.name).join(", ")}
                            </Text>
                        )}

                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={styles.scrollContentContainer}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            <Text style={styles.overview}>
                                {item.overview}
                            </Text>

                            {/* WHERE TO WATCH */}
                            {details?.watchProviders && (
                                <View style={styles.watchProvidersContainer}>
                                    <Text style={styles.watchProvidersTitle}>
                                        📍 Where to Watch
                                    </Text>

                                    {details.watchProviders.inApp && (
                                        <View style={styles.providerGroup}>
                                            <Text style={styles.providerTypeTitle}>BOMBAY</Text>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.providersScrollContent}
                                            >
                                                <View style={styles.providersRow}>
                                                    <View style={styles.providerItem}>
                                                        <Image
                                                            source={require("../images/MainLogo.png")}
                                                            style={styles.providerLogo}
                                                            resizeMode="contain"
                                                        />
                                                        <Text style={styles.providerName}>Canvas</Text>
                                                    </View>
                                                </View>
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* TMDB Groups */}
                                    {["flatrate", "rent", "buy"].map((type) =>
                                        details.watchProviders[type]?.length ? (
                                            <View key={type} style={styles.providerGroup}>
                                                <Text style={styles.providerTypeTitle}>
                                                    {type === "flatrate" ? "STREAM" : type.toUpperCase()}
                                                </Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.providersScrollContent}
                                                >
                                                    <View style={styles.providersRow}>
                                                        {details.watchProviders[type].map((provider: any) => (
                                                            <View
                                                                key={`${type}-${provider.provider_id}`}
                                                                style={styles.providerItem}
                                                            >
                                                                <Image
                                                                    source={{
                                                                        uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
                                                                    }}
                                                                    style={styles.providerLogo}
                                                                />
                                                                <Text style={styles.providerName}>
                                                                    {provider.provider_name}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </ScrollView>
                                            </View>
                                        ) : null
                                    )}
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    <View style={styles.footerContainer}>
                        {loadingDetails === item.id.toString() || !details ? (
                            <View style={styles.logoFallbackContainer}>
                                <ActivityIndicator color="#FF6A00" size="small" />
                            </View>
                        ) : details.trailer ? (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(details.trailer)}
                                style={styles.trailerButton}
                            >
                                <View style={styles.trailerButtonContent}>
                                    <Play color="#ff6a00" size={18} fill="#ff6a00" />
                                    <Text style={styles.trailerButtonText}>
                                        Watch Trailer
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.logoFallbackContainer}>
                                <Image
                                    source={require("../images/MainLogo.png")}
                                    style={styles.fallbackLogo}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                    </View>
                </View>
            );
        },
        [detailsMap, loadingDetails]
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {data.length === 0 && loading ? (
                <View style={styles.centeredLoading}>
                    <ActivityIndicator size="large" color="#FF6A00" />
                    <Text style={styles.loadingText}>Finding your matches...</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    pagingEnabled
                    snapToAlignment="start"
                    snapToInterval={height}
                    decelerationRate="fast"
                    showsVerticalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
                    getItemLayout={getItemLayout}
                    contentInsetAdjustmentBehavior="never"
                    onEndReached={() => {
                        if (hasMore) fetchRecommendations();
                    }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loading ? (
                            <ActivityIndicator color="#FF6A00" style={{ marginBottom: 20 }} />
                        ) : null
                    }
                />
            )}
            <View
                style={[
                    styles.header,
                    {
                        height: (insets.top || 44) + 60,
                        paddingTop: insets.top || 44,
                    }
                ]}
                pointerEvents="box-none"
            >
                <TouchableOpacity
                    onPress={openModal}
                    style={styles.filterButton}
                >
                    <SlidersHorizontal color="#FF6A00" size={24} />
                </TouchableOpacity>
            </View>

            <FilterModal
                visible={isPreferencesVisible}
                onClose={closeModal}
                onApply={() => fetchRecommendations(true)}
                types={types}
                setTypes={setTypes}
                genre={genre}
                setGenre={setGenre}
                language={language}
                setLanguage={setLanguage}
                mood={mood}
                setMood={setMood}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 10,
        backgroundColor: "rgba(0,0,0,0.85)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: "rgba(255,106,0,0.2)",
    },
    filterButton: {
        padding: 10,
        backgroundColor: "rgba(255,106,0,0.15)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,106,0,0.3)",
    },
    itemContainer: {
        width: width,
        height: height,
        paddingHorizontal: 16,
    },
    posterContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    poster: {
        width: 160,
        height: 240,
        borderRadius: 12,
    },
    infoContainer: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
        marginTop: 10,
    },
    scrollContentContainer: {
        paddingBottom: TAB_BAR_HEIGHT + 110,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
    },
    rating: {
        color: "#f5c518",
        marginTop: 6,
    },
    overview: {
        color: "#ccc",
        marginTop: 10,
        lineHeight: 20,
    },
    detailsButton: {
        marginTop: 16,
        backgroundColor: "#222",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    detailsButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    genresText: {
        color: "#aaa",
        fontSize: 14,
        marginTop: 4,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: TAB_BAR_HEIGHT + 50,
        zIndex: 100,
    },
    trailerButton: {
        backgroundColor: "rgba(255,106,0,0.15)",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255,106,0,0.3)",
    },
    trailerButtonText: {
        color: "#ff6a00",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    trailerButtonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    logoFallbackContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 54, // Match trailer button height area
    },
    fallbackLogo: {
        width: 120,
        height: 40,
    },
    watchProvidersContainer: {
        flexDirection: "column",
        marginTop: 14,
    },
    watchProvidersTitle: {
        color: "#fff",
        fontWeight: "600",
        marginBottom: 8,
    },
    inAppText: {
        color: "#aaa",
    },
    providerTypeTitle: {
        color: "#FF6A00",
        fontSize: 10,
        fontWeight: "700",
        marginBottom: 6,
        letterSpacing: 1,
    },
    providerGroup: {
        marginBottom: 16,
    },
    providersScrollContent: {
        paddingVertical: 5,
    },
    providersRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    providerItem: {
        alignItems: "center",
        marginRight: 12,
        marginBottom: 8,
    },
    providerLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    providerName: {
        color: "#aaa",
        fontSize: 10,
        marginTop: 4,
        maxWidth: 60,
        textAlign: "center",
    },
    centeredLoading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    loadingText: {
        color: "#aaa",
        marginTop: 16,
        fontSize: 16,
    },
});

export default RecommendationScreen;