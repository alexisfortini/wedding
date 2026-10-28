import defaults from "@config/ui/registry.json";
import { apiFailure, ApiError, readConfig, requireAdmin, serverDatabase, updateConfig } from "@/lib/serverDatabase";
import { publicRegistry, RegistryGift } from "@/lib/registry";

const STORE_DEFAULTS: { match: string; store_id?: string; store_name: string; store_url: string; registry_added: boolean }[] = [
  { match: "williams-sonoma.com", store_id: "williams-sonoma", store_name: "Williams Sonoma", store_url: "https://www.williams-sonoma.com/registry/56gftcnfpv/registry-list.html", registry_added: true },
  { match: "potterybarn.com", store_id: "williams-sonoma", store_name: "Pottery Barn", store_url: "https://www.williams-sonoma.com/registry/56gftcnfpv/registry-list.html", registry_added: true },
  { match: "westelm.com", store_id: "west-elm", store_name: "West Elm", store_url: "https://www.westelm.com/registry/56gftcnfpv/registry-list.html", registry_added: true },
  { match: "target.com", store_id: "target", store_name: "Target", store_url: "https://www.target.com/gift-registry/gift/9b4faf20-ccdf-11f1-b189-8f8647225e1e", registry_added: true },
  { match: "crateandbarrel.com", store_id: "crate-barrel", store_name: "Crate & Barrel", store_url: "https://www.crateandbarrel.com/gift-registry/alexis-fortini-and-kelsey-hartfelder/r7654248", registry_added: true },
  { match: "bloomingdales.com", store_id: "bloomingdales", store_name: "Bloomingdale’s", store_url: "https://www.bloomingdales.com/registry/Alexis-Fortini-Kelsey-Hartfelder/1937232", registry_added: true },
  { match: "amazon.com", store_id: "amazon", store_name: "Amazon", store_url: "https://www.amazon.com/wedding/guest-view/31FSCKGND23B9", registry_added: true },
  { match: "anthropologie.com", store_id: "anthropologie", store_name: "Anthropologie", store_url: "https://www.anthropologie.com/registry/listing?registryId=5A8E977E7C4E", registry_added: true },
];

function inferFromUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const matched = STORE_DEFAULTS.find(s => host === s.match || host.endsWith(`.${s.match}`));

  const segments = parsed.pathname
    .split("/")
    .map(s => decodeURIComponent(s).trim())
    .filter(s => s && !["p", "dp", "gp", "product", "products", "shop", "listing"].includes(s.toLowerCase()) && !/^[A-Z0-9-]{8,}$/.test(s) && !/^s\d+$/i.test(s) && !/^A-\d+$/i.test(s));

  const rawSlug = segments[segments.length - 1] || "";
  const cleanedSlug = rawSlug
    .replace(/\.html?$/i, "")
    .replace(/-[d]\d+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  const slugTitle = cleanedSlug
    ? cleanedSlug.replace(/\b\w/g, c => c.toUpperCase())
    : "";

  const fallbackStoreName = host.split(".")[0]
    ? host.split(".")[0].replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Store Registry";

  return {
    store_id: matched?.store_id,
    store_name: matched?.store_name || fallbackStoreName,
    store_url: matched?.store_url || "https://www.myregistry.com/wedding-registry/alexis-fortini-and-kelsey-hartfelder-/5692339",
    registry_added: matched ? matched.registry_added : false,
    slugTitle,
  };
}

function decodeHtmlEntities(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&trade;/gi, "™")
    .replace(/&reg;/gi, "®")
    .trim();
}

function extractMeta(html: string, key: string): string {
  const regexes = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of regexes) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1]);
  }
  return "";
}

export async function GET() {
  try {
    const row = await readConfig(serverDatabase(), "registry");
    const value = { ...defaults, ...(row?.value ?? {}) };
    return Response.json({ success: true, value: publicRegistry(value) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(req: Request) {
  try {
    const db = serverDatabase();
    await requireAdmin(req, db);
    const body = await req.json();
    const action = body?.action;

    if (action === "autofill") {
      const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
      if (!rawUrl) throw new ApiError("Please paste a valid product link first.", 400);
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        throw new ApiError("Please enter a valid https:// product link.", 400);
      }

      const inferred = inferFromUrl(parsedUrl.toString());
      let title = inferred.slugTitle;
      let image_url = "";
      let price = "";
      let description = "";

      try {
        const res = await fetch(parsedUrl.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const html = await res.text();
          const ogTitle = extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
          const ogImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
          const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "description");
          const ogPrice = extractMeta(html, "product:price:amount") || extractMeta(html, "og:price:amount");

          if (ogTitle && !/restricted access|access denied|robot|captcha|just a moment/i.test(ogTitle)) {
            title = ogTitle.replace(/\s*[|\-–:]\s*(Williams[- ]Sonoma|Target|Crate\s*&\s*Barrel|West\s*Elm|Pottery\s*Barn|Bloomingdale's|Amazon\.com).*$/i, "").trim();
          }
          if (ogImage && ogImage.startsWith("http")) image_url = ogImage;
          if (ogDesc && !/restricted access|access denied/i.test(ogDesc)) description = ogDesc;
          if (ogPrice) price = ogPrice.startsWith("$") ? ogPrice : `$${ogPrice}`;

          // Check JSON-LD Product block if price or image is still missing
          const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          for (const match of ldMatches) {
            try {
              const parsedLd = JSON.parse(match[1]);
              const nodes = Array.isArray(parsedLd) ? parsedLd : parsedLd?.["@graph"] ? parsedLd["@graph"] : [parsedLd];
              for (const node of nodes) {
                if (node?.["@type"] === "Product" || (Array.isArray(node?.["@type"]) && node["@type"].includes("Product"))) {
                  if (!title && typeof node.name === "string") title = decodeHtmlEntities(node.name);
                  if (!image_url) {
                    const img = Array.isArray(node.image) ? node.image[0] : node.image;
                    if (typeof img === "string" && img.startsWith("http")) image_url = img;
                    else if (typeof img?.url === "string" && img.url.startsWith("http")) image_url = img.url;
                  }
                  if (!description && typeof node.description === "string") {
                    description = decodeHtmlEntities(node.description).slice(0, 280);
                  }
                  if (!price && node.offers) {
                    const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
                    const rawP = offer?.price ?? offer?.lowPrice;
                    if (rawP !== undefined && rawP !== null && String(rawP).trim()) {
                      const pStr = String(rawP).trim();
                      price = pStr.startsWith("$") ? pStr : `$${pStr}`;
                    }
                  }
                }
              }
            } catch {
              // ignore malformed JSON-LD
            }
          }
        }
      } catch {
        // Fallback to URL-inferred metadata if store blocks automated fetch
      }

      return Response.json({
        success: true,
        suggestion: {
          title,
          store_id: inferred.store_id,
          store_name: inferred.store_name,
          store_url: inferred.store_url,
          registry_added: inferred.registry_added,
          item_url: parsedUrl.toString(),
          image_url,
          price,
          description,
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "upsert") {
      const raw = body?.item;
      if (!raw || typeof raw !== "object") throw new ApiError("Invalid registry item payload.", 400);

      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      if (!title || title.length > 300) throw new ApiError("Please enter an item title (up to 300 characters).", 400);

      const itemUrl = typeof raw.item_url === "string" ? raw.item_url.trim() : "";
      if (!itemUrl) throw new ApiError("Please provide a product link (URL).", 400);
      try {
        const u = new URL(itemUrl);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Invalid protocol");
      } catch {
        throw new ApiError("Product link must be a valid http:// or https:// URL.", 400);
      }

      const imageUrl = typeof raw.image_url === "string" ? raw.image_url.trim() : "";
      if (imageUrl) {
        try {
          const imgU = new URL(imageUrl);
          if (imgU.protocol !== "https:" && imgU.protocol !== "http:") throw new Error("Invalid image protocol");
        } catch {
          throw new ApiError("Photo URL must be a valid http:// or https:// link.", 400);
        }
      }

      const inferred = inferFromUrl(itemUrl);
      const rawPrice = typeof raw.price === "string" ? raw.price.trim() : "";
      const formattedPrice = rawPrice
        ? (rawPrice.startsWith("$") || !/^\d/.test(rawPrice) ? rawPrice : `$${rawPrice}`)
        : "";

      const storeName = typeof raw.store_name === "string" && raw.store_name.trim()
        ? raw.store_name.trim()
        : inferred.store_name;
      const storeUrl = typeof raw.store_url === "string" && raw.store_url.trim()
        ? raw.store_url.trim()
        : inferred.store_url;
      const storeId = typeof raw.store_id === "string" && raw.store_id.trim()
        ? raw.store_id.trim()
        : inferred.store_id;
      const category = typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim()
        : "Home";
      const description = typeof raw.description === "string" ? raw.description.trim() : "";
      const quantityRequested = Math.max(1, Math.min(1000, Number(raw.quantity_requested) || 1));
      const isPurchased = Boolean(raw.is_purchased);
      const registryAdded = raw.registry_added !== undefined ? Boolean(raw.registry_added) : inferred.registry_added;

      const next = await updateConfig(db, "registry", defaults, saved => {
        const config = { ...defaults, ...saved };
        const items: RegistryGift[] = Array.isArray(config.items) ? [...config.items] : [];
        const existingIdx = typeof raw.id === "string" && raw.id.trim()
          ? items.findIndex(entry => entry.id === raw.id.trim())
          : -1;

        if (existingIdx >= 0) {
          const prev = items[existingIdx];
          items[existingIdx] = {
            ...prev,
            title,
            price: formattedPrice,
            category,
            store_id: storeId,
            store_name: storeName,
            store_url: storeUrl,
            item_url: itemUrl,
            image_url: imageUrl,
            description,
            enabled: raw.enabled !== false,
            registry_added: registryAdded,
            quantity_requested: quantityRequested,
            is_purchased: isPurchased,
            quantity_purchased: isPurchased ? Math.max(prev.quantity_purchased ?? 0, quantityRequested) : 0,
            ...(isPurchased ? {} : { guest_reported_quantity: 0, purchased_by: undefined, purchased_at: undefined, purchased_note: undefined }),
          } as RegistryGift;
        } else {
          const newItem: RegistryGift = {
            id: `gift-${Date.now()}`,
            title,
            price: formattedPrice,
            category,
            ...(storeId ? { store_id: storeId } : {}),
            store_name: storeName,
            store_url: storeUrl,
            item_url: itemUrl,
            image_url: imageUrl,
            description,
            enabled: true,
            is_purchased: isPurchased,
            registry_added: registryAdded,
            quantity_requested: quantityRequested,
            quantity_purchased: isPurchased ? quantityRequested : 0,
            guest_reported_quantity: 0,
          };
          items.push(newItem);
        }

        return { ...config, items };
      });

      return Response.json({ success: true, value: publicRegistry(next) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "delete") {
      const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";
      if (!itemId) throw new ApiError("Missing item ID to remove.", 400);

      const next = await updateConfig(db, "registry", defaults, saved => {
        const config = { ...defaults, ...saved };
        const items: RegistryGift[] = Array.isArray(config.items) ? config.items : [];
        if (!items.some(entry => entry.id === itemId)) {
          throw new ApiError("That registry item was already removed.", 404);
        }
        return {
          ...config,
          items: items.filter(entry => entry.id !== itemId),
        };
      });

      return Response.json({ success: true, value: publicRegistry(next) }, { headers: { "Cache-Control": "no-store" } });
    }

    throw new ApiError("Unsupported registry action.", 400);
  } catch (error) {
    return apiFailure(error);
  }
}
