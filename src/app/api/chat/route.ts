import {
  CHAT_MAX_HISTORY,
  CHAT_MAX_HISTORY_CHARS,
  CHAT_MAX_MESSAGE_CHARS,
  CHAT_MODEL,
  CHAT_SYSTEM_PROMPT,
} from "@/lib/chat/config";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "@/lib/chat/rate-limit";
import {
  compareProductsForChat,
  getCatalogStatsForChat,
  searchProductsForChat,
  type ChatLink,
  type ChatProductCard,
  type ChatProductSearchInput,
} from "@/lib/chat/product-search";
import {
  getAccountHelpForChat,
  getShippingHelpForChat,
  getShopInfoForChat,
} from "@/lib/chat/shop-info";

export const runtime = "nodejs";

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

type OpenAiMessage =
  | { role: "system"; content: string }
  | { role: "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Vyhľadá produkty v katalógu PACIDEKOR. Predvolene len skladom. Pri otázke na dostupnosť / vypredané nastav includeOutOfStock=true. Pri akciách onSaleOnly=true. Pri farbe vždy color.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Kľúčové slová (bez zbytočných slov). Aj použitie: svadba, hrob, výloha, interiér…",
          },
          category: {
            type: "string",
            description:
              "Kategória ak je jasná (napr. Umelé kvety, Sušina, Dekorácie).",
          },
          color: {
            type: "string",
            description: "Farba po slovensky (napr. žltá, biela, zelená).",
          },
          onSaleOnly: {
            type: "boolean",
            description: "Len produkty v akcii.",
          },
          minDiscountPercent: {
            type: "number",
            description: "Minimálna zľava v % (napr. 30).",
          },
          limit: {
            type: "number",
            description:
              "PRESNÝ počet produktov na vrátenie (1–6). Ak zákazník chce 1, daj 1. Ak 2, daj 2. Default 3.",
          },
          requireAny: {
            type: "array",
            items: { type: "string" },
            description:
              "Aspoň jeden z týchto výrazov musí byť v produkte (napr. [\"ruža\"] alebo [\"georgína\",\"dália\"]).",
          },
          exclude: {
            type: "array",
            items: { type: "string" },
            description:
              "Výrazy, ktoré sa v produkte NESMÚ vyskytnúť (napr. [\"narcis\"]). Pri doplnku k X vždy vylúč X.",
          },
          includeOutOfStock: {
            type: "boolean",
            description:
              "true = zahrň aj vypredané (kontrola skladu / farby). Default false.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_products",
      description:
        "Porovná 2 produkty podľa názvu alebo dopytu. Použi keď zákazník chce porovnať / rozdiel medzi dvoma produktmi.",
      parameters: {
        type: "object",
        properties: {
          productA: {
            type: "string",
            description: "Názov alebo dopyt na prvý produkt.",
          },
          productB: {
            type: "string",
            description: "Názov alebo dopyt na druhý produkt.",
          },
        },
        required: ["productA", "productB"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_shop_info",
      description:
        "Vráti kontaktné údaje firmy PACIDEKOR (telefón, e-mail, adresa) a odkaz na stránku Kontakt. Bez zoznamu predajní.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_shipping_info",
      description:
        "Vráti aktuálne možnosti dopravy a platby (Packeta, osobný odber, ceny, doprava zadarmo).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_account_help",
      description:
        "Pomoc s prihlásením, registráciou, obľúbenými, newsletterom a odkazmi na účet.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_catalog_stats",
      description:
        "Vráti aktuálne počty produktov v katalógu: celkovo, skladom, vypredané, v akcii (aj podľa skladu) a rozpis podľa kategórií. Použi pri otázkach koľko máte produktov / akcií / skladom.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}

/** Odstráni markdown ** a podobné značky z odpovede do UI. */
function stripChatMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?)]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeHistory(messages: IncomingMessage[]): IncomingMessage[] {
  const cleaned = messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  const last = cleaned[cleaned.length - 1];
  if (last?.role === "user" && last.content.length > CHAT_MAX_MESSAGE_CHARS) {
    last.content = last.content.slice(0, CHAT_MAX_MESSAGE_CHARS);
  }

  return cleaned
    .map((message) => ({
      ...message,
      content: message.content.slice(0, CHAT_MAX_HISTORY_CHARS),
    }))
    .slice(-CHAT_MAX_HISTORY);
}

async function generateChatTitle(userMessage: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        max_tokens: 24,
        messages: [
          {
            role: "system",
            content:
              "Vymysli krátky názov chatu (2–5 slov po slovensky) podľa prvej správy zákazníka. Len názov, bez úvodzoviek a bez bodky.",
          },
          { role: "user", content: userMessage.slice(0, 200) },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const title = data.choices?.[0]?.message?.content?.trim();
    if (!title) return null;
    return title.replace(/^["„“']+|["„“']+$/g, "").slice(0, 48);
  } catch {
    return null;
  }
}

async function callOpenAi(messages: OpenAiMessage[], useTools: boolean) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.35,
      max_tokens: 320,
      messages,
      ...(useTools ? { tools: CHAT_TOOLS, tool_choice: "auto" } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI error", response.status, text.slice(0, 800));
    throw new Error("OPENAI_ERROR");
  }

  return response.json() as Promise<{
    choices: Array<{
      message: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>;
      };
    }>;
  }>;
}

function mergeLinks(...groups: Array<ChatLink[] | undefined>): ChatLink[] {
  const seen = new Set<string>();
  const out: ChatLink[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const link of group) {
      if (!link?.href || !link.label) continue;
      if (!link.href.startsWith("/") || link.href.startsWith("//")) continue;
      const key = link.href;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: link.label.slice(0, 80), href: link.href.slice(0, 200) });
    }
  }
  return out;
}

async function runTool(
  name: string,
  rawArgs: string,
  fallbackQuery: string,
): Promise<{ content: string; products?: ChatProductCard[]; links?: ChatLink[] }> {
  switch (name) {
    case "search_products": {
      let args: ChatProductSearchInput = {};
      try {
        args = JSON.parse(rawArgs || "{}") as ChatProductSearchInput;
      } catch {
        args = { query: fallbackQuery };
      }
      const requestedLimit = Math.min(
        6,
        Math.max(1, Math.round(args.limit ?? 3)),
      );
      args = { ...args, limit: requestedLimit };
      const result = await searchProductsForChat(args);
      const {
        products,
        totalMatching,
        onSaleOnly,
        onSaleTotal,
        onSaleInStock,
        onSaleOutOfStock,
        includedOutOfStock,
      } = result;
      const links: ChatLink[] =
        onSaleOnly && (onSaleTotal ?? totalMatching) > 0
          ? [
              {
                label: "Zobraziť všetky akčné produkty",
                href: "/akcia",
              },
            ]
          : [];
      const stockNote = includedOutOfStock
        ? "Vo výsledku môžu byť vypredané položky (inStock=false) a/alebo alternatívy. Jasne povedzte, čo je skladom a čo nie; farby sú v availableColors."
        : "Všetky karty sú skladom. Farby produktu sú v availableColors (v texte ich nemusíte vypisovať všetky).";
      return {
        products,
        links,
        content: JSON.stringify({
          count: products.length,
          totalMatching,
          onSaleOnly,
          onSaleTotal,
          onSaleInStock,
          onSaleOutOfStock,
          includedOutOfStock: Boolean(includedOutOfStock),
          requestedLimit,
          ui_note: onSaleOnly
            ? products.length === 0
              ? "Momentálne nie sú skladom žiadne akčné produkty. Ak onSaleTotal > 0, povedzte že akcie sú, ale sú vypredané."
              : `V akcii je celkovo ${onSaleTotal ?? totalMatching} produktov (skladom ${onSaleInStock ?? totalMatching}, vypredané ${onSaleOutOfStock ?? 0}). Zobrazuje sa ${products.length} vybraných kariet. V texte uveďte tieto počty jasne. Karty a tlačidlo „Zobraziť všetky akčné produkty“ sa zobrazia automaticky — nevypisujte názvy/ceny.`
            : products.length === 0
              ? "Nič sa nenašlo. Úprimne to povedzte; nevymýšľajte produkty. Môžete navrhnúť úpravu požiadavky alebo 1 podobný typ ďalším searchom."
              : `Karty (${products.length} z požadovaných ${requestedLimit}, celkovo nájdených ${totalMatching}) sa zobrazia automaticky. ${stockNote} V texte nevypisujte názvy/ceny — len krátky úvod.`,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discount,
            colorId: product.colorId,
            inStock: product.inStock,
            availableColors: product.availableColors,
          })),
        }),
      };
    }
    case "compare_products": {
      let productA = "";
      let productB = "";
      try {
        const args = JSON.parse(rawArgs || "{}") as {
          productA?: string;
          productB?: string;
        };
        productA = String(args.productA ?? "").trim();
        productB = String(args.productB ?? "").trim();
      } catch {
        productA = "";
        productB = "";
      }
      if (!productA || !productB) {
        return {
          content: JSON.stringify({
            error: "Chýba productA alebo productB.",
            ui_note: "Opýtajte sa na názvy oboch produktov.",
          }),
        };
      }
      const result = await compareProductsForChat(productA, productB);
      return {
        products: result.products,
        content: JSON.stringify(result.comparison),
      };
    }
    case "get_shop_info": {
      const info = getShopInfoForChat();
      return {
        content: JSON.stringify(info),
        links: [{ label: "Kontakt", href: "/kontakt" }],
      };
    }
    case "get_shipping_info":
      return { content: JSON.stringify(getShippingHelpForChat()) };
    case "get_account_help":
      return { content: JSON.stringify(getAccountHelpForChat()) };
    case "get_catalog_stats":
      return { content: JSON.stringify(await getCatalogStatsForChat()) };
    default:
      return { content: JSON.stringify({ error: "Unknown tool" }) };
  }
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);

  const minute = checkRateLimit(`chat:min:${ip}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!minute.ok) {
    return json(
      {
        error: "Príliš veľa požiadaviek. Skúste o chvíľu znova.",
        retryAfterSec: minute.retryAfterSec,
      },
      429,
      { "Retry-After": String(minute.retryAfterSec ?? 60) },
    );
  }

  const hour = checkRateLimit(`chat:hour:${ip}`, {
    limit: 60,
    windowMs: 60 * 60_000,
  });
  if (!hour.ok) {
    return json(
      {
        error: "Dosiahli ste hodinový limit chatu. Skúste neskôr.",
        retryAfterSec: hour.retryAfterSec,
      },
      429,
      { "Retry-After": String(hour.retryAfterSec ?? 3600) },
    );
  }

  let body: {
    messages?: IncomingMessage[];
    honeypot?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Neplatná požiadavka." }, 400);
  }

  if (body.honeypot && body.honeypot.trim().length > 0) {
    return json({
      reply: "Ďakujem za správu.",
      products: [] as ChatProductCard[],
    });
  }

  const history = sanitizeHistory(body.messages ?? []);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return json({ error: "Chýba správa." }, 400);
  }

  if (lastUser.content.length < 2) {
    return json({ error: "Správa je príliš krátka." }, 400);
  }

  const messages: OpenAiMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  try {
    let recommendedCards: ChatProductCard[] = [];
    let recommendedLinks: ChatLink[] = [];
    let data = await callOpenAi(messages, true);
    let assistant = data.choices[0]?.message;

    if (assistant?.tool_calls?.length) {
      const toolMessages: OpenAiMessage[] = [
        {
          role: "assistant",
          content: assistant.content ?? null,
          tool_calls: assistant.tool_calls,
        },
      ];

      for (const call of assistant.tool_calls) {
        const result = await runTool(
          call.function.name,
          call.function.arguments || "{}",
          lastUser.content,
        );
        if (result.products?.length) {
          recommendedCards = result.products;
        }
        if (result.links?.length) {
          recommendedLinks = mergeLinks(recommendedLinks, result.links);
        }
        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.content,
        });
      }

      data = await callOpenAi([...messages, ...toolMessages], false);
      assistant = data.choices[0]?.message;
    }

    const rawReply =
      assistant?.content?.trim() ||
      "Prepáčte, práve sa mi nepodarilo pripraviť odpoveď. Skúste to prosím znova.";
    const reply = stripChatMarkdown(rawReply);

    const products =
      recommendedCards.length > 0 ? recommendedCards.slice(0, 6) : [];
    const links = recommendedLinks;

    const userCount = history.filter((message) => message.role === "user").length;
    const title =
      userCount === 1 ? await generateChatTitle(lastUser.content) : null;

    return json({
      reply,
      products,
      links,
      ...(title ? { title } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_API_KEY") {
      return json(
        { error: "Chat nie je nakonfigurovaný (chýba OPENAI_API_KEY)." },
        503,
      );
    }
    console.error("chat route", error);
    return json(
      { error: "Chat je dočasne nedostupný. Skúste to o chvíľu." },
      502,
    );
  }
}
