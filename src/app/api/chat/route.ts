import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ToolLoopAgent, createAgentUIStreamResponse, tool, UIMessage } from 'ai';
import { z } from 'zod';
import { apiFailure, ApiError, readConfig, serverDatabase } from '@/lib/serverDatabase';

// Config imports – @config maps to ./config/* per tsconfig paths
import generalConfig from '@config/ui/general.json';
import faqConfig from '@config/ui/faq.json';
import travelConfig from '@config/ui/travel.json';
import storyConfig from '@config/ui/story.json';
import registryConfig from '@config/ui/registry.json';
import djConfig from '@config/ui/dj_lineup.json';


const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Dynamic system prompt built from config JSON files
// ---------------------------------------------------------------------------
async function buildSystemPrompt(): Promise<string> {
  const db = serverDatabase();
  const keys = ['general', 'faq', 'travel', 'story', 'registry', 'dj_lineup'];
  const defaults = [generalConfig, faqConfig, travelConfig, storyConfig, registryConfig, djConfig];
  const configs = await Promise.all(keys.map((key, i) => readConfig(db, key).then(row => row?.value ?? defaults[i])));
  const { data: events, error } = await db.from('events').select('*').eq('is_public', true);
  if (error) throw new ApiError('The concierge could not load the current schedule. Please try again.');
  return renderSystemPrompt(configs[0], configs[1], configs[2], configs[3], configs[4], configs[5], events ?? []);
}

function renderSystemPrompt(generalConfig: any, faqConfig: any, travelConfig: any, storyConfig: any, registryConfig: any, djConfig: any, eventsConfig: any[]): string {
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

  // Registry & Honeymoon Fund
  const fundObj = (registryConfig as any).cash_fund || (registryConfig as any).honeymoon_fund;
  let fundText = '';
  if (fundObj) {
    const parts = [
      `- ${fundObj.title || 'Honeymoon Fund'}: ${fundObj.description || ''}`,
      fundObj.venmo_handle ? `Venmo Handle: ${fundObj.venmo_handle}` : '',
      fundObj.zelle_recipient ? `Zelle Recipient: ${fundObj.zelle_recipient}` : '',
      fundObj.zelle_email ? `Zelle Email: ${fundObj.zelle_email}` : '',
      fundObj.zelle_phone ? `Zelle Phone: ${fundObj.zelle_phone}` : '',
      fundObj.payment_url ? `Payment Link: ${fundObj.payment_url}` : '',
    ].filter(Boolean);
    fundText = parts.join(' | ');
  }
  const registryItemsText = ((registryConfig as any).items || [])
    .map((r: any) => `- ${r.title}${r.price ? ` (${r.price})` : ''} from ${r.store_name || r.store || 'Registry'}: ${r.description || ''}${r.item_url || r.url ? ' (Link: ' + (r.item_url || r.url) + ')' : ''}`)
    .join('\n');
  const registryStoresText = ((registryConfig as any).stores || [])
    .map((s: any) => `- ${s.name}: ${s.description || ''} (Link: ${s.url})`)
    .join('\n');
  const registryText = [fundText, registryItemsText, registryStoresText].filter(Boolean).join('\n');

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
4. For personal invitations, household details, or RSVP status, direct guests to the Response section on this website. You cannot access guest records.
5. For registry and gift questions, let guests know they can contribute to our Honeymoon Fund directly via Venmo or Zelle (with instant live progress tracking on our site), or browse our curated physical registry items. Share the exact handles and details provided above.
`;
}

// ---------------------------------------------------------------------------
// Main Concierge Agent
// ---------------------------------------------------------------------------
function createConcierge(instructions: string) { return new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  instructions,
  tools: {
    getLiveWeather: tool({
      description: 'Get the current live weather data for a specific location.',
      inputSchema: z.object({
        location: z.string().describe('The location to get weather for (e.g., Indio, California).')
      }),
      execute: async ({ location }: { location: string }) => {
        try {
          // Live weather from open-meteo for Indio
          const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.7222&longitude=-116.2156&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph', { signal: AbortSignal.timeout(10000) });
          if (!res.ok) throw new Error('Weather unavailable');
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
    }),

  }
}); }

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) throw new ApiError('The concierge is temporarily unavailable.');
    const { messages }: { messages: UIMessage[] } = await req.json();
    if (!Array.isArray(messages) || !messages.length || messages.length > 60 || JSON.stringify(messages).length > 64000) throw new ApiError('Please start a new conversation or shorten your message.', 400);
    const mainConciergeAgent = createConcierge(await buildSystemPrompt());

    return createAgentUIStreamResponse({
      agent: mainConciergeAgent,
      uiMessages: messages,
      abortSignal: req.signal,
    });
  } catch (error: any) {
    return apiFailure(error);
  }
}
