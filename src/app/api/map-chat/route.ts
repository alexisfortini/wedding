import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, stepCountIs, UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { apiFailure, ApiError } from '@/lib/serverDatabase';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 30;

const MAPBOX_SEARCH_URL = 'https://api.mapbox.com/search/searchbox/v1/forward';
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

const SYSTEM_PROMPT = `You are the Map Voyager for Alexis & Kelsey's wedding in Indio/Palm Springs.
Help guests find locations and get directions.

Context:
- Wedding Venue: The Bougainvillea Estate (33.682, -116.237).
- Airport: PSP (33.829, -116.506).

Mandatory Rules:
1. You MUST call 'geocodePlaces' when a user asks to find/search for places (e.g. coffee, tacos, restaurants, hotels, etc.).
   - You MUST populate the 'query' parameter with the specific term the user is searching for (e.g. "tacos", "coffee", "pharmacy").
   - NEVER call 'geocodePlaces' with an empty query or empty parameters.
2. You MUST call 'getDirections' when a user asks for directions or how to get from point A to point B.
   - You MUST populate the 'origin' and 'destination' parameters.
   - If the user asks for directions to a place but does not specify a starting point (origin), assume the starting point is "The Bougainvillea Estate" (Wedding Venue).
3. If you call 'geocodePlaces', explain to the guest in your text response that you've searched for it and the spots are now highlighted on their map.
4. If you call 'getDirections', explain to the guest in your text response that you've highlighted the route for them on the map.`;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) throw new ApiError('Map search is temporarily unavailable.');
    const { messages }: { messages: UIMessage[] } = await req.json();
    if (!Array.isArray(messages) || !messages.length || messages.length > 60 || JSON.stringify(messages).length > 64000) throw new ApiError('Please reset the conversation or shorten your message.', 400);

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      abortSignal: req.signal,
      stopWhen: stepCountIs(5),
      tools: {
        geocodePlaces: tool({
          description: 'Search for places and return their coordinates to plot on the map.',
          inputSchema: z.object({
            query: z.string().trim().min(1).max(300).describe('The search query, e.g., "coffee shops near Indio CA"'),
          }),
          execute: async ({ query }: { query: string }) => {
            if (!query || !query.trim()) {
              console.warn('geocodePlaces received empty query');
              return { found: false, results: [], message: 'Query cannot be empty.' };
            }
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) throw new Error("Mapbox token missing");

            const url = new URL(MAPBOX_SEARCH_URL);
            url.searchParams.append('q', query);
            url.searchParams.append('access_token', token);
            url.searchParams.append('types', 'poi,address,place');
            url.searchParams.append('limit', '5');
            url.searchParams.append('proximity', '-116.237,33.682');
            url.searchParams.append('bbox', '-116.70,33.50,-116.10,33.90');

            const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error('Map service unavailable');
            const data = await response.json();
            
            if (!data.features || data.features.length === 0) {
              return { found: false, results: [] };
            }

            const results = data.features.map((feat: any) => ({
              id: feat.id || feat.properties.mapbox_id || feat.properties.id || String(Math.random()),
              name: feat.properties.name || feat.properties.full_address || 'Unknown Place',
              lat: feat.geometry.coordinates[1],
              lng: feat.geometry.coordinates[0],
              type: 'AI_Search',
            }));

            return { found: true, results };
          },
        }),
        getDirections: tool({
          description: 'Fetch driving directions between any two points (by name or coordinates) and draw them on the map.',
          inputSchema: z.object({
            origin: z.string().trim().min(1).max(300).describe('Name of the starting point, e.g., "Palm Springs Airport" or "Starbucks Palm Springs"'),
            originCoords: z.object({
              lat: z.number().min(-90).max(90),
              lng: z.number().min(-180).max(180),
            }).optional().describe('Coordinates of the start point if known'),
            destination: z.string().trim().min(1).max(300).describe('Name of the destination point, e.g., "The Bougainvillea Estate" or "JW Marriott"'),
            destCoords: z.object({
              lat: z.number().min(-90).max(90),
              lng: z.number().min(-180).max(180),
            }).optional().describe('Coordinates of the destination if known'),
          }),
          execute: async ({ origin, originCoords, destination, destCoords }: { 
            origin: string;
            originCoords?: { lat: number; lng: number };
            destination: string;
            destCoords?: { lat: number; lng: number };
          }) => {
            if (!origin || !origin.trim() || !destination || !destination.trim()) {
              console.warn('getDirections received empty parameters');
              return { found: false, message: 'Origin and destination cannot be empty.' };
            }
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) throw new Error("Mapbox token missing");

            let orig = originCoords;
            let dest = destCoords;

            // Geocode origin if coordinates are not provided
            if (!orig) {
              const url = `${MAPBOX_SEARCH_URL}?q=${encodeURIComponent(origin)}&access_token=${token}&limit=1&proximity=-116.237,33.682`;
              try {
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) throw new Error('Map service unavailable');
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                  orig = {
                    lat: data.features[0].geometry.coordinates[1],
                    lng: data.features[0].geometry.coordinates[0]
                  };
                }
              } catch (e) {
                console.error("Geocoding origin failed:", e);
              }
            }

            // Geocode destination if coordinates are not provided
            if (!dest) {
              const url = `${MAPBOX_SEARCH_URL}?q=${encodeURIComponent(destination)}&access_token=${token}&limit=1&proximity=-116.237,33.682`;
              try {
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) throw new Error('Map service unavailable');
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                  dest = {
                    lat: data.features[0].geometry.coordinates[1],
                    lng: data.features[0].geometry.coordinates[0]
                  };
                }
              } catch (e) {
                console.error("Geocoding destination failed:", e);
              }
            }

            if (!orig || !dest) {
              return { 
                found: false, 
                message: `Could not resolve coordinates. Start: ${orig ? 'OK' : 'Failed'}, Destination: ${dest ? 'OK' : 'Failed'}` 
              };
            }

            const coordsString = `${orig.lng},${orig.lat};${dest.lng},${dest.lat}`;
            const url = `${MAPBOX_DIRECTIONS_URL}/${coordsString}?geometries=geojson&access_token=${token}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error('Map service unavailable');
            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
              return { found: false, message: "Could not find a driving route." };
            }

            const route = data.routes[0];
            return {
              found: true,
              origin: origin,
              destination: destination,
              distance: (route.distance / 1609.34).toFixed(1),
              duration: Math.round(route.duration / 60),
              geometry: route.geometry,
              originCoords: orig,
              destinationCoords: dest
            };
          }
        })
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    return apiFailure(error);
  }
}
