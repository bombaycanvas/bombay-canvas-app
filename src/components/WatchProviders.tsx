import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Linking,
    StyleSheet
} from "react-native";
import FastImage from "@d11/react-native-fast-image";
import { TvMinimalPlay } from "lucide-react-native";

interface WatchProvidersProps {
    details: any;
    itemId: string;
    activeProviderTabs: Record<string, string>;
    setActiveProviderTabs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const WatchProviders: React.FC<WatchProvidersProps> = ({
    details,
    itemId,
    activeProviderTabs,
    setActiveProviderTabs
}) => {
    const tabs = [
        { id: "flatrate", label: "Stream" },
        { id: "rent", label: "Rent" },
        { id: "buy", label: "Buy" }
    ];

    const availableTabs = tabs.filter(tab => details?.watchProviders?.[tab.id]?.length > 0);
    const currentTab = activeProviderTabs[itemId] || (availableTabs.length > 0 ? availableTabs[0].id : "flatrate");
    const providers = details?.watchProviders?.[currentTab] || [];

    return (
        <View style={styles.watchProvidersContainer}>
            <View style={styles.topRow}>
                <View style={styles.watchProvidersHeader}>
                    <TvMinimalPlay color="#FF6A00" size={20} />
                    <Text style={[styles.watchProvidersTitle, { marginLeft: 6 }]}>
                        Where to Watch
                    </Text>
                </View>

                {/* Horizontal Tabs */}
                <View style={styles.tabsContainer}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tabItem,
                                currentTab === tab.id && styles.activeTabItem
                            ]}
                            onPress={() => setActiveProviderTabs(prev => ({ ...prev, [itemId]: tab.id }))}
                        >
                            <Text style={[
                                styles.tabLabel,
                                currentTab === tab.id && styles.activeTabLabel
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.flatProvidersRow}>
                {providers.length > 0 ? (
                    providers.map((provider: any) => (
                        <TouchableOpacity
                            key={`${provider.provider_id}`}
                            style={styles.smallProviderItem}
                            onPress={() => provider.link && Linking.openURL(provider.link)}
                            activeOpacity={0.7}
                        >
                            <FastImage
                                source={{
                                    uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
                                    priority: FastImage.priority.high,
                                    cache: FastImage.cacheControl.immutable,
                                }}
                                style={styles.smallProviderLogo}
                            />
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.noProvidersShortText}>
                        Not available for {tabs.find(t => t.id === currentTab)?.label.toLowerCase()}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    watchProvidersContainer: {
        flexDirection: "column",
        marginTop: 8,
        gap: 6,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    watchProvidersHeader: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
    },
    watchProvidersTitle: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 13,
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 2,
        flex: 1,
        marginLeft: 10,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 6,
        alignItems: "center",
        borderRadius: 6,
    },
    activeTabItem: {
        backgroundColor: "rgba(255,106,0,0.2)",
    },
    tabLabel: {
        color: "#aaa",
        fontSize: 12,
        fontWeight: "500",
    },
    activeTabLabel: {
        color: "#FF6A00",
        fontWeight: "700",
    },
    flatProvidersRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    smallProviderItem: {
        marginRight: 8,
        marginBottom: 4,
    },
    smallProviderLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    noProvidersShortText: {
        color: "#555",
        fontSize: 12,
        fontStyle: "italic",
        marginTop: 4,
    },
});

export default WatchProviders;
