export type CustomerType = "maloobchod" | "velkoobchod";

export type CustomerStatus =
  | "aktivny"
  | "ziada_registraciu"
  | "zamietnuty"
  | "zablokovany";

export type Customer = {
  id: string;
  type: CustomerType;
  status: CustomerStatus;
  name: string;
  email: string;
  phone: string;
  company?: string;
  ico?: string;
  dic?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note?: string;
  createdAtLabel: string;
  registeredAtLabel?: string;
};

export type WholesaleRegistrationInput = {
  name: string;
  company: string;
  ico: string;
  dic?: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note?: string;
  password: string;
};

export type RetailRegistrationInput = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  password: string;
};

export type CustomerAuthResult =
  | { ok: true; customer: Customer }
  | { ok: false; error: string };

/** @deprecated Use CustomerAuthResult */
export type WholesaleAuthResult = CustomerAuthResult;

export const CUSTOMERS_STORAGE_KEY = "pacidekor.customers";
export const CUSTOMER_PASSWORDS_KEY = "pacidekor.customer-passwords";
export const CUSTOMERS_EVENT = "pacidekor:customers-changed";

export const CUSTOMER_TYPE_META: Record<
  CustomerType,
  { label: string; className: string }
> = {
  maloobchod: {
    label: "Maloobchod",
    className: "bg-[#e8ebe2] text-[#5f6a49]",
  },
  velkoobchod: {
    label: "Veľkoobchod",
    className: "bg-[#e0e7ff] text-[#3730a3]",
  },
};

export const CUSTOMER_STATUS_META: Record<
  CustomerStatus,
  { label: string; className: string }
> = {
  aktivny: {
    label: "Aktívny",
    className: "bg-[#dcfce7] text-[#15803d]",
  },
  ziada_registraciu: {
    label: "Žiada registráciu",
    className: "bg-[#ffedd5] text-[#c2410c]",
  },
  zamietnuty: {
    label: "Zamietnutý",
    className: "bg-[#fee2e2] text-[#b91c1c]",
  },
  zablokovany: {
    label: "Zablokovaný",
    className: "bg-[#f3f4f6] text-[#4b5563]",
  },
};

export const customers: Customer[] = [
  {
    id: "c-001",
    type: "velkoobchod",
    status: "ziada_registraciu",
    name: "Mária Kováčová",
    company: "Kvetinárstvo Ruža",
    email: "objednavky@kvetinarstvo-ruza.sk",
    phone: "+421 903 112 334",
    ico: "46882115",
    dic: "SK2023456789",
    street: "Hlavná 18",
    city: "Trnava",
    zip: "917 01",
    country: "Slovensko",
    note: "Záujem o pravidelné veľkoobchodné odbery ruží a pivónií.",
    createdAtLabel: "pred 2 hod.",
  },
  {
    id: "c-002",
    type: "velkoobchod",
    status: "ziada_registraciu",
    name: "Martin Čech",
    company: "Event Decor s.r.o.",
    email: "martin@eventdecor.sk",
    phone: "+421 948 120 555",
    ico: "50112233",
    dic: "SK2023987654",
    street: "Priemyselná 8",
    city: "Trenčín",
    zip: "911 01",
    country: "Slovensko",
    note: "Organizácia svadieb a eventov – potrebuje VO ceny.",
    createdAtLabel: "včera",
  },
  {
    id: "c-003",
    type: "velkoobchod",
    status: "aktivny",
    name: "Mária Horváthová",
    company: "Floristika Mária",
    email: "maria@floristika.sk",
    phone: "+421 918 445 090",
    ico: "51220987",
    street: "Námestie SNP 5",
    city: "Banská Bystrica",
    zip: "974 01",
    country: "Slovensko",
    createdAtLabel: "pred 3 tými.",
    registeredAtLabel: "pred 2 tými.",
  },
  {
    id: "c-004",
    type: "velkoobchod",
    status: "aktivny",
    name: "Eva Šimková",
    company: "Dekor Ateliér",
    email: "info@dekoratelier.sk",
    phone: "+421 917 333 210",
    ico: "44551209",
    street: "Mlynská 14",
    city: "Košice",
    zip: "040 01",
    country: "Slovensko",
    createdAtLabel: "pred 2 mes.",
    registeredAtLabel: "pred 2 mes.",
  },
  {
    id: "c-005",
    type: "maloobchod",
    status: "aktivny",
    name: "Jana Nováková",
    email: "jana.novakova@email.sk",
    phone: "+421 905 778 221",
    street: "Štúrova 42",
    city: "Bratislava",
    zip: "811 02",
    country: "Slovensko",
    createdAtLabel: "pred 5 dňami",
    registeredAtLabel: "pred 5 dňami",
  },
  {
    id: "c-006",
    type: "maloobchod",
    status: "aktivny",
    name: "Peter Horváth",
    email: "peter.horvath@gmail.com",
    phone: "+421 911 220 118",
    street: "Legionárska 9",
    city: "Nitra",
    zip: "949 01",
    country: "Slovensko",
    createdAtLabel: "pred 1 tými.",
    registeredAtLabel: "pred 1 tými.",
  },
  {
    id: "c-007",
    type: "maloobchod",
    status: "aktivny",
    name: "Lucia Farkašová",
    email: "lucia.f@email.sk",
    phone: "+421 904 889 012",
    street: "Poľná 27",
    city: "Prešov",
    zip: "080 01",
    country: "Slovensko",
    createdAtLabel: "pred 2 tými.",
    registeredAtLabel: "pred 2 tými.",
  },
  {
    id: "c-008",
    type: "velkoobchod",
    status: "zamietnuty",
    name: "Igor Novotný",
    company: "Novotný Decor",
    email: "igor.novotny@email.sk",
    phone: "+421 903 555 101",
    ico: "99887766",
    street: "Kollárova 6",
    city: "Poprad",
    zip: "058 01",
    country: "Slovensko",
    note: "Neúplné firemné údaje – žiadosť zamietnutá.",
    createdAtLabel: "pred 1 mes.",
  },
  {
    id: "c-009",
    type: "maloobchod",
    status: "aktivny",
    name: "Zuzana Králová",
    email: "zuzana.kralova@gmail.com",
    phone: "+421 915 441 778",
    street: "Dunajská 11",
    city: "Bratislava",
    zip: "811 08",
    country: "Slovensko",
    createdAtLabel: "pred 3 tými.",
    registeredAtLabel: "pred 3 tými.",
  },
  {
    id: "c-010",
    type: "maloobchod",
    status: "zablokovany",
    name: "Tomáš Belko",
    email: "tomas.belko@outlook.com",
    phone: "+421 902 661 440",
    street: "Jesenského 3",
    city: "Žilina",
    zip: "010 01",
    country: "Slovensko",
    note: "Podozrivé opakované storná objednávok.",
    createdAtLabel: "pred 4 dňami",
    registeredAtLabel: "pred 4 dňami",
  },
];

const DEMO_PASSWORD = "test";

type PasswordMap = Record<string, string>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isCustomer(value: unknown): value is Customer {
  if (!value || typeof value !== "object") return false;
  const item = value as Customer;
  return (
    typeof item.id === "string" &&
    typeof item.type === "string" &&
    typeof item.status === "string" &&
    typeof item.name === "string" &&
    typeof item.email === "string" &&
    typeof item.phone === "string" &&
    typeof item.street === "string" &&
    typeof item.city === "string" &&
    typeof item.zip === "string" &&
    typeof item.country === "string"
  );
}

function seedPasswords(): PasswordMap {
  const map: PasswordMap = {};
  for (const customer of customers) {
    if (customer.status === "aktivny") {
      map[normalizeEmail(customer.email)] = DEMO_PASSWORD;
    }
  }
  return map;
}

export function seedCustomers(): Customer[] {
  return customers.map((customer) => ({ ...customer }));
}

export function readCustomers(): Customer[] {
  if (typeof window === "undefined") return seedCustomers();
  try {
    const raw = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return seedCustomers();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seedCustomers();
    const valid = parsed.filter(isCustomer);
    return valid.length > 0 ? valid : seedCustomers();
  } catch {
    return seedCustomers();
  }
}

export function writeCustomers(list: Customer[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CUSTOMERS_EVENT));
}

export function readPasswords(): PasswordMap {
  if (typeof window === "undefined") return seedPasswords();
  try {
    const raw = window.localStorage.getItem(CUSTOMER_PASSWORDS_KEY);
    if (!raw) return seedPasswords();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return seedPasswords();
    }
    const map: PasswordMap = { ...seedPasswords() };
    for (const [email, password] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof password === "string" && password.length > 0) {
        map[normalizeEmail(email)] = password;
      }
    }
    return map;
  } catch {
    return seedPasswords();
  }
}

export function writePasswords(map: PasswordMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_PASSWORDS_KEY, JSON.stringify(map));
}

export function customerDisplayName(customer: Customer) {
  return customer.company || customer.name;
}

export function getCustomerById(
  id: string,
  list: Customer[] = typeof window === "undefined"
    ? seedCustomers()
    : readCustomers(),
) {
  return list.find((customer) => customer.id === id);
}

export function registerWholesaleCustomer(
  input: WholesaleRegistrationInput,
): WholesaleAuthResult {
  const email = normalizeEmail(input.email);
  const list = readCustomers();

  if (list.some((customer) => normalizeEmail(customer.email) === email)) {
    return {
      ok: false,
      error: "Účet s týmto e-mailom už existuje.",
    };
  }

  const customer: Customer = {
    id: `c-${Date.now()}`,
    type: "velkoobchod",
    status: "ziada_registraciu",
    name: input.name.trim(),
    company: input.company.trim(),
    email,
    phone: input.phone.trim(),
    ico: input.ico.trim(),
    dic: input.dic?.trim() || undefined,
    street: input.street.trim(),
    city: input.city.trim(),
    zip: input.zip.trim(),
    country: input.country.trim() || "Slovensko",
    note: input.note?.trim() || undefined,
    createdAtLabel: "práve teraz",
  };

  const next = [customer, ...list];
  writeCustomers(next);

  const passwords = readPasswords();
  passwords[email] = input.password;
  writePasswords(passwords);

  return { ok: true, customer };
}

export function authenticateWholesale(
  emailRaw: string,
  password: string,
): WholesaleAuthResult {
  const email = normalizeEmail(emailRaw);
  const list = readCustomers();
  const customer = list.find(
    (item) =>
      item.type === "velkoobchod" && normalizeEmail(item.email) === email,
  );

  if (!customer) {
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  const passwords = readPasswords();
  if (passwords[email] !== password) {
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  if (customer.status === "ziada_registraciu") {
    return {
      ok: false,
      error: "Vaša žiadosť ešte čaká na schválenie.",
    };
  }

  if (customer.status === "zamietnuty") {
    return {
      ok: false,
      error: "Vaša žiadosť bola zamietnutá. Kontaktujte nás pre viac informácií.",
    };
  }

  if (customer.status === "zablokovany") {
    return {
      ok: false,
      error: "Tento účet je zablokovaný.",
    };
  }

  if (customer.status !== "aktivny") {
    return { ok: false, error: "Prihlásenie nie je možné." };
  }

  return { ok: true, customer };
}

export function registerRetailCustomer(
  input: RetailRegistrationInput,
): CustomerAuthResult {
  const email = normalizeEmail(input.email);
  const list = readCustomers();

  if (list.some((customer) => normalizeEmail(customer.email) === email)) {
    return {
      ok: false,
      error: "Účet s týmto e-mailom už existuje.",
    };
  }

  const customer: Customer = {
    id: `c-${Date.now()}`,
    type: "maloobchod",
    status: "aktivny",
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    zip: input.zip.trim(),
    country: input.country.trim() || "Slovensko",
    createdAtLabel: "práve teraz",
    registeredAtLabel: "práve teraz",
  };

  const next = [customer, ...list];
  writeCustomers(next);

  const passwords = readPasswords();
  passwords[email] = input.password;
  writePasswords(passwords);

  return { ok: true, customer };
}

export function authenticateRetail(
  emailRaw: string,
  password: string,
): CustomerAuthResult {
  const email = normalizeEmail(emailRaw);
  const list = readCustomers();
  const customer = list.find(
    (item) =>
      item.type === "maloobchod" && normalizeEmail(item.email) === email,
  );

  if (!customer) {
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  const passwords = readPasswords();
  if (passwords[email] !== password) {
    return { ok: false, error: "Nesprávny e-mail alebo heslo." };
  }

  if (customer.status === "zablokovany") {
    return {
      ok: false,
      error: "Tento účet je zablokovaný.",
    };
  }

  if (customer.status !== "aktivny") {
    return { ok: false, error: "Prihlásenie nie je možné." };
  }

  return { ok: true, customer };
}

export function updateCustomerInStore(
  id: string,
  patch: Partial<Customer>,
): Customer[] {
  const list = readCustomers();
  const next = list.map((customer) =>
    customer.id === id ? { ...customer, ...patch } : customer,
  );
  writeCustomers(next);
  return next;
}

export function deleteCustomerFromStore(id: string): Customer[] {
  const list = readCustomers().filter((customer) => customer.id !== id);
  writeCustomers(list);
  return list;
}
