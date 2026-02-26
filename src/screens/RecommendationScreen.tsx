import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";

import { GENRES, LANGUAGES, MOODS } from "../constants/filters";
import SelectionChip from "../components/SelectionChip";
import { getRecommendations, getContentDetails } from "../api/recommendation";
import { trackEvent } from "../api/event";

const { height } = Dimensions.get("window");

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
  const [types, setTypes] = useState<string[]>(["movie"]);
  const [genre, setGenre] = useState("action");
  const [language, setLanguage] = useState("english");
  const [mood, setMood] = useState("excited");

  const [data, setData] = useState<RecommendationItem[]>([]);
  const [showFeed, setShowFeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [detailsMap, setDetailsMap] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  /* -------- WATCH / SKIP TRACKING -------- */
  const viewStartTime = useRef<number>(Date.now());
  const currentItemId = useRef<string | number | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      const item: RecommendationItem = viewableItems[0].item;
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
    []
  );

  /* ---------------- FETCH ---------------- */
  const fetchRecommendations = async (reset = false) => {
    if (loading) return;

    try {
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
      setShowFeed(true);
      setPage((p) => (reset ? 2 : p + 1));
    } catch (err) {
      console.error("Recommendation error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH DETAILS ---------------- */
  const fetchDetails = async (item: RecommendationItem) => {
    const key = item.id.toString();

    if (detailsMap[key]) return;

    try {
      setLoadingDetails(key);

      const cleanId =
  typeof item.id === "string" && item.id.startsWith("internal-")
    ? item.id.replace("internal-", "")
    : item.id.toString();

      const res = await getContentDetails(item.type || "movie", cleanId);
      console.log("Fetching details for:", item);
       console.log("DETAILS RESPONSE:", res);
      setDetailsMap((prev) => ({
        ...prev,
        [key]: res,
      }));
    } catch (err) {
      console.log("Details error:", err);
    } finally {
      setLoadingDetails(null);
    }
  };

  /* ---------------- FEED ITEM ---------------- */
  const renderItem = useCallback(
    ({ item }: { item: RecommendationItem }) => {
      const details = detailsMap[item.id.toString()];

      return (
        <View
          style={{
            minHeight: CARD_HEIGHT,
            paddingHorizontal: 16,
            justifyContent: "flex-start",
          }}
        >
          {/* POSTER */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            {item.poster && (
              <Image
                source={{ uri: item.poster }}
                style={{
                  width: 160,
                  height: 240,
                  borderRadius: 12,
                }}
                resizeMode="cover"
              />
            )}
          </View>

          {/* <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
          > */}
          <View style={{ paddingBottom: 80 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff" }}>
              {item.title}
            </Text>

            <Text style={{ color: "#f5c518", marginTop: 6 }}>
              ⭐ {item.rating ?? "N/A"} • {item.language?.toUpperCase()} •{" "}
              {item.year ?? "—"}
            </Text>

            <Text
              style={{
                color: "#ccc",
                marginTop: 10,
                lineHeight: 20,
              }}
            >
              {item.overview}
            </Text>

            {/* DETAILS BUTTON */}
            <TouchableOpacity
              onPress={() => fetchDetails(item)}
              style={{
                marginTop: 16,
                backgroundColor: "#222",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff" }}>
                {loadingDetails === item.id.toString()
                  ? "Loading..."
                  : "View Details"}
              </Text>
            </TouchableOpacity>

            {/* TRAILER */}
            {details?.trailer && (
              <TouchableOpacity
                onPress={() => Linking.openURL(details.trailer)}
                style={{
                  marginTop: 12,
                  backgroundColor: "#FF3D00",
                  padding: 14,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  🎬 Watch Trailer
                </Text>
              </TouchableOpacity>
            )}

            {/* WHERE TO WATCH */}
            {details?.watchProviders && (
  <View style={{ marginTop: 14 }}>
    <Text
      style={{
        color: "#fff",
        fontWeight: "600",
        marginBottom: 8,
      }}
    >
      📍 Where to Watch
    </Text>

    {/* Internal Show */}
    {details.watchProviders.inApp && (
      <Text style={{ color: "#aaa" }}>
        Available on Bombay Canvas
      </Text>
    )}

    {/* TMDB Providers */}
    {!details.watchProviders.inApp && (
      <>
        {["flatrate", "rent", "buy"].map((type) =>
          details.watchProviders[type]?.length ? (
            <View key={type} style={{ marginBottom: 8 }}>
              <Text style={{ color: "#FF6A00", marginBottom: 4 }}>
                {type.toUpperCase()}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {details.watchProviders[type].map((provider: any) => (
                  <View
                    key={provider.provider_id}
                    style={{
                      alignItems: "center",
                      marginRight: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                      }}
                    />
                    <Text
                      style={{
                        color: "#aaa",
                        fontSize: 10,
                        marginTop: 4,
                        maxWidth: 60,
                        textAlign: "center",
                      }}
                    >
                      {provider.provider_name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null
        )}
      </>
    )}
  </View>
)}
          </View>
        </View>
      );
    },
    [detailsMap, loadingDetails]
  );

  /* ================= FEED VIEW ================= */
  if (showFeed) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View
          style={{
            height: HEADER_HEIGHT,
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowFeed(false);
              setPage(1);
              setData([]);
              currentItemId.current = null;
            }}
          >
            <Text style={{ color: "#FF6A00", fontSize: 16 }}>
              ← Change Preferences
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
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
      </View>
    );
  }

  /* ================= FILTER VIEW ================= */
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 20, fontWeight: "600", color: "#fff" }}>
          Choose Preferences
        </Text>

        <Text style={{ marginTop: 20, color: "#aaa" }}>Content Type</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <SelectionChip
            label="Movies"
            selected={types.includes("movie")}
            onPress={() => setTypes(["movie"])}
          />
          <SelectionChip
            label="TV Shows"
            selected={types.includes("tv")}
            onPress={() => setTypes(["tv"])}
          />
        </View>

        <Text style={{ marginTop: 20, color: "#aaa" }}>Genre</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {GENRES.map((g) => (
            <SelectionChip
              key={g.value}
              label={g.label}
              selected={genre === g.value}
              onPress={() => setGenre(g.value)}
            />
          ))}
        </View>

        <Text style={{ marginTop: 20, color: "#aaa" }}>Language</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {LANGUAGES.map((l) => (
            <SelectionChip
              key={l.value}
              label={l.label}
              selected={language === l.value}
              onPress={() => setLanguage(l.value)}
            />
          ))}
        </View>

        <Text style={{ marginTop: 20, color: "#aaa" }}>Mood</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
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
          onPress={() => fetchRecommendations(true)}
          style={{
            marginTop: 32,
            backgroundColor: "#FF6A00",
            padding: 16,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Get Recommendations
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default RecommendationScreen;