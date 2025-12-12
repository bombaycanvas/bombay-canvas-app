import { Movie } from './movie';

export type RootStackParamList = {
  Search: undefined;
  CategoryMovies: { category: string; movies: Movie[] };
  SeriesDetail: { id: string };
};
