import "server-only";

import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerInvoicePdfFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "Roboto-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Roboto-Bold.ttf"), fontWeight: 700 },
    ],
  });
  registered = true;
}
