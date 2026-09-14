import { PlaceSearchResult } from '../types/navigation';

export interface SearchResponse {
  results: PlaceSearchResult[];
  error?: string;
  isOffline?: boolean;
}

export class PlaceSearchService {
  private baseUrl: string = 'https://nominatim.openstreetmap.org/search';
  private currentAbortController: AbortController | null = null;

  /**
   * Search for places matching the query string using Nominatim Geocoding API.
   * Cancels any pending in-flight search request automatically.
   */
  public async search(query: string): Promise<SearchResponse> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return { results: [] };
    }

    // Abort previous in-flight request if user keeps typing
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const timeoutId = setTimeout(() => {
      this.currentAbortController?.abort();
    }, 8000);

    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(
        trimmedQuery
      )}&format=json&addressdetails=1&limit=10&accept-language=en`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'NavDR-NavigationApp/1.0 (contact: navdr@sih2026.internal)',
          'Accept-Language': 'en',
          Accept: 'application/json',
        },
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          results: [],
          error: `Geocoding service error (${response.status})`,
        };
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return { results: [], error: 'Malformed geocoding response' };
      }

      const results: PlaceSearchResult[] = data.map((item: any, index: number) => {
        const rawName = item.name || item.display_name?.split(',')[0] || 'Unknown Place';
        const parts = (item.display_name || '').split(',');
        const address = parts.length > 1 ? parts.slice(1).join(',').trim() : item.display_name || '';

        return {
          id: String(item.place_id || `place_${index}_${Date.now()}`),
          name: rawName,
          address: address || rawName,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          type: item.type || item.class || 'location',
        };
      }).filter((res) => Number.isFinite(res.latitude) && Number.isFinite(res.longitude));

      return { results };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        // Request was aborted cleanly due to typing or timeout; suppress error
        return { results: [] };
      }

      // Detect network failure or offline state
      const isNetworkError =
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed');

      return {
        results: [],
        error: isNetworkError ? 'Search unavailable offline' : 'Unable to complete search request',
        isOffline: isNetworkError,
      };
    } finally {
      this.currentAbortController = null;
    }
  }

  public cancelSearch(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}

export const placeSearchService = new PlaceSearchService();
