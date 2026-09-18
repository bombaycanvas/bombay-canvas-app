export interface Genre {
  id: string;
  name: string;
}

export interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  trailerUrl?: string | null;
  genres?: Genre[];
  language?: {
    id: string;
    code: string;
    label: string;
    nativeLabel: string | null;
  } | null;
  uploader?: {
    id: string;
    name: string;
    profiles?: {
      avatarUrl: string;
    }[];
  };
}

export interface Category {
  id: string;
  name: string;
}

export interface CoverVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
}
