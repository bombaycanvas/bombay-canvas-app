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
    useWindowDimensions,
    ScrollView,
    PixelRatio,
} from "react-native";
import FastImage from "@d11/react-native-fast-image";
const scale = PixelRatio.getFontScale();
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { SlidersHorizontal, Play, TvMinimalPlay, SearchX, Clapperboard } from "lucide-react-native";

import FilterModal from "../components/FilterModal";
import WatchProviders from "../components/WatchProviders";
import { getRecommendations, getContentDetails } from "../api/recommendation";
import { trackEvent } from "../api/events";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [types, setTypes] = useState<string[]>(["movie"]);
    const [genre, setGenre] = useState<string[]>(["action"]);
    const [language, setLanguage] = useState("english");
    const [mood, setMood] = useState("chill");

    const [data, setData] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [detailsMap, setDetailsMap] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [isPreferencesVisible, setIsPreferencesVisible] = useState(false);
    const [expandedOverviews, setExpandedOverviews] = useState<Record<string, boolean>>({});
    const [activeProviderTabs, setActiveProviderTabs] = useState<Record<string, string>>({});

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

        const cacheKey = `content_details_${key}`;

        try {
            // Try cache first for instant display
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                setDetailsMap((prev) => ({ ...prev, [key]: parsed }));
            }

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
            // Save to cache
            AsyncStorage.setItem(cacheKey, JSON.stringify(res)).catch(() => { });
        } catch (err) {
            console.log("Details error:", err);
        } finally {
            setLoadingDetails(null);
        }
    }, [detailsMap, loadingDetails, expandedOverviews, activeProviderTabs]);

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
                limit: 5,
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

            // Pre-fetch next item if it exists
            const currentIndex = data.findIndex(d => d.id === item.id);
            if (currentIndex !== -1 && currentIndex < data.length - 1) {
                fetchDetails(data[currentIndex + 1]);
            }

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
        [height]
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
                        { width, height, paddingTop: insets.top + 60 }
                    ]}
                >
                    <View style={styles.posterContainer}>
                        {item.poster && (
                            <FastImage
                                source={{ uri: item.poster }}
                                style={[
                                    styles.poster,
                                    {
                                        width: width * 0.45,
                                        height: (width * 0.45) * 1.2
                                    }
                                ]}
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

                        <View style={styles.overviewContainer}>
                            <ScrollView
                                style={{ maxHeight: 200 }}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                <Text
                                    style={styles.overview}
                                    numberOfLines={expandedOverviews[item.id.toString()] ? undefined : 3}
                                >
                                    {item.overview}
                                </Text>
                                {item.overview?.length > 150 && (
                                    <TouchableOpacity
                                        onPress={() => setExpandedOverviews(prev => ({
                                            ...prev,
                                            [item.id.toString()]: !prev[item.id.toString()]
                                        }))}
                                    >
                                        <Text style={styles.readMoreText}>
                                            {expandedOverviews[item.id.toString()] ? "Read Less" : "Read More"}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.watchButtonWrapper}>
                        {(() => {
                            const isInternal = item.id.toString().startsWith("internal-");

                            if (isInternal) {
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={styles.trailerButton}
                                        onPress={() => {
                                            const cleanId = item.id.toString().replace("internal-", "");
                                            navigation.navigate("SeriesDetail", { id: cleanId, posterUrl: item.poster });
                                        }}
                                    >
                                        <View style={styles.trailerButtonContent}>
                                            <Play color="#ff6a00" size={18} fill="#ff6a00" />
                                            <Text style={styles.trailerButtonText}>Watch On Canvas</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }

                            if (details?.watchProviders?.inApp) {
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={styles.trailerButton}
                                        onPress={() => {
                                            navigation.navigate("SeriesDetail", { id: item.id.toString(), posterUrl: item.poster });
                                        }}
                                    >
                                        <View style={styles.trailerButtonContent}>
                                            <Play color="#ff6a00" size={18} fill="#ff6a00" />
                                            <Text style={styles.trailerButtonText}>Watch On Canvas</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }

                            if (details?.trailer) {
                                return (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(details.trailer)}
                                        style={styles.trailerButton}
                                    >
                                        <View style={styles.trailerButtonContent}>
                                            <Play color="#ff6a00" size={18} fill="#ff6a00" />
                                            <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.trailerButton}
                                    onPress={() => { }}
                                >
                                    <View style={styles.trailerButtonContent}>
                                        <Play color="#ff6a00" size={18} fill="#ff6a00" />
                                        <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })()}
                        {details?.watchProviders && (
                            <View style={styles.providersWrapper}>
                                <WatchProviders
                                    details={details}
                                    itemId={item.id.toString()}
                                    activeProviderTabs={activeProviderTabs}
                                    setActiveProviderTabs={setActiveProviderTabs}
                                />
                            </View>
                        )}
                    </View>
                </View >
            );
        },
        [detailsMap, expandedOverviews, activeProviderTabs, height, width, insets]
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {data.length === 0 && loading ? (
                <View style={styles.centeredLoading}>
                    <ActivityIndicator size="large" color="#FF6A00" />
                    <Text style={styles.loadingText}>Finding your matches...</Text>
                </View>
            ) : data.length === 0 ? (
                <View style={styles.centeredLoading}>
                    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 80, height: 80 }}>
                        <Clapperboard color="#FF6A00" size={70} />
                        <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#000', borderRadius: 10, padding: 2 }}>
                            <SearchX color="#FF6A00" size={20} />
                        </View>
                    </View>
                    <Text style={styles.loadingText}>No matches found</Text>
                    <Text style={{ color: "#555", fontSize: 14, marginTop: 8 }}>
                        Try different filters
                    </Text>
                    <TouchableOpacity onPress={openModal} style={[styles.filterButton, { marginTop: 20 }]}>
                        <Text style={{ color: "#FF6A00", fontWeight: "700" }}>Change Filters</Text>
                    </TouchableOpacity>
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
                    disableIntervalMomentum={true}
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
        backgroundColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
    },
    filterButton: {
        padding: 10,
        backgroundColor: "rgba(255,106,0,0.15)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,106,0,0.3)",
    },
    itemContainer: {
        paddingHorizontal: 16,
        paddingBottom: 200, // Increased space for footer and tab bar
    },
    posterContainer: {
        alignItems: "center",
        marginBottom: 4,
    },
    poster: {
        width: 200,
        height: 300,
        borderRadius: 12,
    },
    infoContainer: {
        // flex: 1,
        marginBottom: 4,
    },
    overviewContainer: {
        maxHeight: 120,
        marginTop: 6,
        marginBottom: 8,
    },
    scrollContent: {
        marginTop: 4,
        marginBottom: 4,
    },
    providersWrapper: {
        marginTop: 10,
    },
    title: {
        fontSize: 24 * scale,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: -0.5,
    },
    rating: {
        color: "#aaa",
        fontSize: 14 * scale,
        marginTop: 6,
    },
    overview: {
        color: "#ddd",
        fontSize: 16 * scale,
        marginTop: 10,
        lineHeight: 22 * scale,
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
    watchButtonWrapper: {
        width: '100%',
        marginTop: 10,
        marginBottom: 4,
    },
    trailerButton: {
        width: '100%',
        backgroundColor: "rgba(255,106,0,0.15)",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255,106,0,0.3)",
    },
    trailerButtonText: {
        color: "#ff6a00",
        fontSize: 18 * scale,
        fontWeight: "700",
        marginLeft: 10,
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
    readMoreText: {
        color: "#FF6A00",
        fontSize: 14,
        fontWeight: "600",
        marginTop: 4,
    },
});

export default RecommendationScreen;