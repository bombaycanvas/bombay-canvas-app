export interface Genre {
  id: string;
  name: string;
}

export interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  genres?: Genre[];
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
