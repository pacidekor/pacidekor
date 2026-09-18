# Faktúry (PDF)

Serverové generovanie PDF cez `@react-pdf/renderer` (štýl Rezit).

## Volanie

```ts
import {
  ensureInvoiceForOrder,
  renderInvoicePdf,
  buildInvoiceDownloadUrl,
} from "@/lib/invoicing";

const invoice = await ensureInvoiceForOrder(order, { paid: true });
const pdf = await renderInvoicePdf(invoice);
const url = buildInvoiceDownloadUrl(invoice.invoice_number);
```

Alebo priamo buffer:

```ts
import { generateInvoicePdfBuffer } from "@/lib/invoicing";
import type { InvoicePdfData } from "@/lib/invoicing";

const pdf = await generateInvoicePdfBuffer(data);
```

## Assety v `public/`

- `public/fonts/Roboto-Regular.ttf`
- `public/fonts/Roboto-Bold.ttf`
- voliteľne logo: `public/invoice-logo.png` (alebo `.webp` / `logo.png`)

## Env

- `INVOICE_IBAN` — SK IBAN na faktúre (default je produkčný účet PACIDEKOR)
- `ORDER_VIEW_SECRET` — podpis download URL (`/api/invoices/FA-…?t=…`)

## Číslovanie

`FA-YYYY-NNNN` (atomická DB funkcia `next_invoice_number`). VS = len číslice (napr. `20260001`).

## Preview (dev)

- http://localhost:3000/dev/invoices
- http://localhost:3000/dev/invoices/paid.pdf
- http://localhost:3000/dev/invoices/cod.pdf

QR platba sa nepoužíva — GoPay faktúry sú označené ako uhradené, dobierka ako platba pri prevzatí.

## Neskôr

- ARES pre odberateľa podľa IČO
- splatnosť podľa objednávky
- finálne účet/logo
