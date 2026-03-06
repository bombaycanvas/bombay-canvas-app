import { API_BASE_URL } from "../config/api";


export const getRecommendations = async (payload: {
    userId: string;
    types: string[];
    genre: string;
    language: string;
    mood?: string;
    page?: number;
    limit?: number;
}) => {
    const res = await fetch(`${API_BASE_URL}/recommend`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch recommendations");
    }

    const data = await res.json();
    console.log(`FETCHED RECOMMENDATIONS COUNT: ${data?.data?.length || 0}`);
    return data;
};
export const getContentDetails = async (
    type: string,
    id: string
) => {
    const url = `${API_BASE_URL}/recommend/content/${type}/${id}`;
    console.log("CONTENT URL:", url);

    const res = await fetch(url);

    if (!res.ok) {
        const text = await res.text();
        console.log("DETAIL ERROR:", text);
        throw new Error("Failed to fetch content details");
    }

    return res.json();
};
