import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, stepCountIs, UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

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
    const { messages }: { messages: UIMessage[] } = await req.json();
    console.log('=== MAP-CHAT REQUEST RECEIVED ===');
    console.log('Messages count:', messages.length);
    console.log('Last message:', JSON.stringify(messages[messages.length - 1], null, 2));

    const modelMessages = await convertToModelMessages(messages);
    console.log('Converted model messages:', JSON.stringify(modelMessages, null, 2));

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      onStepFinish: (step) => {
        console.log('=== MAP-CHAT STEP FINISH ===');
        console.log('Finish Reason:', step.finishReason);
        console.log('Step Text:', step.text);
        console.log('Step Tool Calls:', JSON.stringify(step.toolCalls, null, 2));
        console.log('Step Tool Results:', JSON.stringify(step.toolResults, null, 2));
      },
      tools: {
        geocodePlaces: tool({
          description: 'Search for places and return their coordinates to plot on the map.',
          parameters: z.object({
            query: z.string().describe('The search query, e.g., "coffee shops near Indio CA"'),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log('--- Executing geocodePlaces tool ---');
            console.log('Query:', query);
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

            const response = await fetch(url.toString());
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
        } as any),
        getDirections: tool({
          description: 'Fetch driving directions between any two points (by name or coordinates) and draw them on the map.',
          parameters: z.object({
            origin: z.string().describe('Name of the starting point, e.g., "Palm Springs Airport" or "Starbucks Palm Springs"'),
            originCoords: z.object({
              lat: z.number(),
              lng: z.number(),
            }).optional().describe('Coordinates of the start point if known'),
            destination: z.string().describe('Name of the destination point, e.g., "The Bougainvillea Estate" or "JW Marriott"'),
            destCoords: z.object({
              lat: z.number(),
              lng: z.number(),
            }).optional().describe('Coordinates of the destination if known'),
          }),
          execute: async ({ origin, originCoords, destination, destCoords }: { 
            origin: string;
            originCoords?: { lat: number; lng: number };
            destination: string;
            destCoords?: { lat: number; lng: number };
          }) => {
            console.log('--- Executing getDirections tool ---');
            console.log('Params:', { origin, originCoords, destination, destCoords });
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
                const res = await fetch(url);
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
                const res = await fetch(url);
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

            const response = await fetch(url);
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
        } as any)
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('MAP_CHAT_ERROR:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
