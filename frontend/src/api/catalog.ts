import { apiClient } from './client';
import type { Movie, SeatMap, Show, Theatre } from '../types/api';

export const moviesApi = {
  list: () => apiClient.request<{ movies: Movie[] }>('/movies'),
};

export const theatresApi = {
  list: () => apiClient.request<{ theatres: Theatre[] }>('/theatres'),
};

export const showsApi = {
  list: () => apiClient.request<{ shows: Show[] }>('/shows'),
  seatMap: (showId: number) =>
    apiClient.request<SeatMap>(`/shows/${showId}/seats`),
};