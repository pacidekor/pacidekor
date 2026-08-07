import {
  CHAT_MAX_HISTORY,
  CHAT_MAX_MESSAGE_CHARS,
  CHAT_MODEL,
  CHAT_SYSTEM_PROMPT,
} from "@/lib/chat/config";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "@/lib/chat/rate-limit";
import {
  searchProductsForChat,
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
        "Vyhľadá aktuálne produkty v katalógu PACIDEKOR (skladom). Vždy nastav limit na presný počet, ktorý zákazník chce. Použi requireAny pre konkrétny typ (ruža…) a exclude pre zakázané (narcis… / produkt, ku ktorému hľadáme doplnok).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Kľúčové slová na dohľadanie (bez zbytočných slov typu poradte/chcem). Napr. výplň, do kvetináča, sušina.",
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
        },
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
        "Pomoc s prihlásením a registráciou (maloobchod / veľkoobchod) vrátane odkazov.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}

function sanitizeHistory(messages: IncomingMessage[]): IncomingMessage[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, CHAT_MAX_MESSAGE_CHARS),
    }))
    .filter((message) => message.content.length > 0)
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
      temperature: 0.5,
      max_tokens: 500,
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

async function runTool(
  name: string,
  rawArgs: string,
  fallbackQuery: string,
): Promise<{ content: string; products?: ChatProductCard[] }> {
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
      const products = await searchProductsForChat(args);
      return {
        products,
        content: JSON.stringify({
          count: products.length,
          requestedLimit,
          ui_note:
            products.length === 0
              ? "Nič sa nenašlo. Úprimne to povedzte; nevymýšľajte produkty. Môžete navrhnúť úpravu požiadavky alebo 1 podobný typ ďalším searchom."
              : `Karty (${products.length} z požadovaných ${requestedLimit}) sa zobrazia automaticky. V texte ich nevypisujte — len krátky úvod. Neodporúčajte viac produktov, než je kariet.`,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discount,
            colorId: product.colorId,
            inStock: product.inStock,
          })),
        }),
      };
    }
    case "get_shop_info":
      return { content: JSON.stringify(getShopInfoForChat()) };
    case "get_shipping_info":
      return { content: JSON.stringify(getShippingHelpForChat()) };
    case "get_account_help":
      return { content: JSON.stringify(getAccountHelpForChat()) };
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
        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.content,
        });
      }

      data = await callOpenAi([...messages, ...toolMessages], false);
      assistant = data.choices[0]?.message;
    }

    const reply =
      assistant?.content?.trim() ||
      "Prepáčte, práve sa mi nepodarilo pripraviť odpoveď. Skúste to prosím znova.";

    const products =
      recommendedCards.length > 0 ? recommendedCards.slice(0, 6) : [];

    const userCount = history.filter((message) => message.role === "user").length;
    const title =
      userCount === 1 ? await generateChatTitle(lastUser.content) : null;

    return json({ reply, products, ...(title ? { title } : {}) });
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
