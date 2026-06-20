import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ToolLoopAgent, createAgentUIStreamResponse, tool, UIMessage } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Config imports – @config maps to ./config/* per tsconfig paths
import generalConfig from '@config/ui/general.json';
import faqConfig from '@config/ui/faq.json';
import travelConfig from '@config/ui/travel.json';
import storyConfig from '@config/ui/story.json';
import registryConfig from '@config/ui/registry.json';
import djConfig from '@config/ui/dj_lineup.json';
import eventsConfig from '@config/db/events.json';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Server-side Supabase client using service role key to bypass RLS (lazily initialized to prevent build-time compilation crashes)
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseClient;
}

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Dynamic system prompt built from config JSON files
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  // General info
  const couple = `${generalConfig.partner1} & ${generalConfig.partner2}`;
  const date = generalConfig.date;
  const location = generalConfig.location_name;

  // Events – only public ones
  const eventsText = (eventsConfig as any[])
    .filter((e) => e.is_public !== false)
    .map(
      (e) =>
        `- ${e.title}: ${e.date || ''}, ${e.start_time || ''} – ${e.end_time || ''}${e.location ? ' at ' + e.location : ''}. Dress code: ${e.dress_code || 'Not specified'}.`
    )
    .join('\n');

  // FAQ
  const faqText = (faqConfig.list as any[])
    .map((q) => `Q: ${q.q}\nA: ${q.a}`)
    .join('\n\n');

  // Hotels
  const hotelsText = (travelConfig.hotels as any[])
    .map((h) => `- ${h.title}${h.book_url ? ' — Book: ' + h.book_url : ''}: ${h.description || ''}`)
    .join('\n');

  // Airports
  const airportsText = (travelConfig.airports as any[])
    .map((a) => `- ${a.title}${a.tag ? ' (' + a.tag + ')' : ''}: ${a.description || ''}`)
    .join('\n');

  // Local favorites
  const favoritesText = (travelConfig.favorites as any[])
    .map((f) => `- ${f.title}: ${f.description || ''}`)
    .join('\n');

  // Our Story
  const storyText = (storyConfig.timeline as any[])
    .map((s) => `- ${s.year || ''}: ${s.title} — ${s.description || ''}`)
    .join('\n');

  // Registry
  const registryText = (registryConfig.funds as any[])
    .map((r) => `- ${r.title}: ${r.description || ''}${r.url ? ' (Link: ' + r.url + ')' : ''}`)
    .join('\n');

  // DJ Lineup
  const djText = (djConfig.events as any[])
    .map((event) => {
      const sets = (event.lineup as any[])
        .map((slot) => `  - ${slot.dj} @ ${slot.time}`)
        .join('\n');
      return `${event.name}:\n${sets}`;
    })
    .join('\n');

  return `
You are the Desert Concierge for ${couple}'s upcoming wedding. Your goal is to answer guest questions politely, warmly, and concisely, matching the luxurious, minimalistic Palm Springs/Indio desert wedding aesthetic.

## Wedding Details
- The Couple: ${couple}
- Date: ${date}
- Location: ${location}
- Venue: The Bougainvillea Estate

## Events
${eventsText}

## Frequently Asked Questions
${faqText}

## Travel & Hotels
### Airports
${airportsText}

### Hotels
${hotelsText}

### Local Favorites & Activities
${favoritesText}

## Our Story
${storyText}

## Registry
${registryText}

## DJ Lineup & Entertainment
${djText}

## Rules
1. NEVER hallucinate details not listed above. If you don't know the exact answer, say: "I don't have that specific detail in my notes, but please feel free to reach out to ${generalConfig.partner1} and ${generalConfig.partner2} directly!"
2. Keep responses brief but incredibly warm and helpful. Use emojis sparingly.
3. If asked about weather, ALWAYS use the getLiveWeather tool to check real API forecast data.
4. If a guest asks to check if they are on the list, ALWAYS use checkRSVPStatus tool.
5. For registry questions, share the direct links provided above.
`;
}

// ---------------------------------------------------------------------------
// Main Concierge Agent
// ---------------------------------------------------------------------------
const mainConciergeAgent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  instructions: buildSystemPrompt(),
  tools: {
    getLiveWeather: tool({
      description: 'Get the current live weather data for a specific location.',
      parameters: z.object({
        location: z.string().describe('The location to get weather for (e.g., Indio, California).')
      }),
      execute: async ({ location }: { location: string }) => {
        try {
          // Live weather from open-meteo for Indio
          const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.7222&longitude=-116.2156&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph');
          const data = await res.json();
          return {
            location,
            liveData: data.current_weather,
            historicalContext: "In April, historical averages in Indio are very pleasant: highs around 85°F and lows near 58°F. Sunny Skies."
          };
        } catch (e) {
          return { error: 'Weather unavailable at the moment.' };
        }
      }
    } as any),
    checkRSVPStatus: tool({
      description: 'Look up a guest in the wedding RSVP database by name to check their invite status.',
      parameters: z.object({
        guestName: z.string().describe('The first and last name of the guest.'),
      }),
      execute: async ({ guestName }: { guestName: string }) => {
        const parts = guestName.trim().split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');

        const supabase = getSupabaseClient();
        let query = supabase
          .from('guests')
          .select('first_name, last_name, rsvp_status, party_id, parties(party_name)')
          .ilike('first_name', firstName);

        if (lastName) {
          query = query.ilike('last_name', lastName);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
          return {
            guestName,
            status: 'Not Found',
            message: `I couldn't find "${guestName}" on the guest list. Please double-check the spelling or reach out to the couple directly.`,
          };
        }

        const guest = data[0] as any;
        return {
          guestName: `${guest.first_name} ${guest.last_name}`,
          status: guest.rsvp_status || 'pending',
          partyName: guest.parties?.party_name || null,
          message: `Found ${guest.first_name} ${guest.last_name} on the guest list!`,
        };
      }
    } as any)
  }
});

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    return createAgentUIStreamResponse({
      agent: mainConciergeAgent,
      uiMessages: messages,
    });
  } catch (error: any) {
    console.error('CHAT_ROUTE_ERROR:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
