import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const RecommendationCard = ({ item }: any) => {
  return (
    <View style={styles.card}>

      {/* 🔹 TOP ROW */}
      <View style={styles.topRow}>
        {/* Poster */}
        <Image
          source={{ uri: item.poster }}
          style={styles.poster}
          resizeMode="cover"
        />

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.meta}>
            ⭐ {item.rating?.toFixed(1)} • {item.year} • {item.language?.toUpperCase()}
          </Text>

          {item.runtime && (
            <Text style={styles.meta}>
              ⏱ {item.runtime} min
            </Text>
          )}

          {item.director && (
            <Text style={styles.meta}>
              🎬 {item.director}
            </Text>
          )}
        </View>
      </View>

      {/* 🔹 OVERVIEW */}
      <Text style={styles.overview} numberOfLines={4}>
        {item.overview}
      </Text>

      {/* 🔹 GENRES */}
      {item.genres && (
        <Text style={styles.genres}>
          {item.genres.join(" • ")}
        </Text>
      )}
    </View>
  );
};

export default RecommendationCard;

const styles = StyleSheet.create({
  card: {
    height: "100%",
    padding: 16,
    backgroundColor: "#000",
    justifyContent: "center",
  },

  topRow: {
    flexDirection: "row",
  },

  poster: {
    width: 110,
    height: 160,
    borderRadius: 8,
  },

  details: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  meta: {
    marginTop: 6,
    color: "#ccc",
    fontSize: 13,
  },

  overview: {
    marginTop: 16,
    color: "#ddd",
    fontSize: 14,
    lineHeight: 20,
  },

  genres: {
    marginTop: 10,
    color: "#999",
    fontSize: 12,
  },
});
