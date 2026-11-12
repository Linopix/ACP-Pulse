/** Öffentliche Marke für Anmeldung und Kopfzeile. Keine Secrets. */
import { brand, signalHex, signalInk } from "@/brand";
import { getSql } from "@/lib/db";

export type PublicBrand = {
  companyName: string;
  productName: string;
  tagline: string;
  signal: string;
  signalInk: string;
};

export function fallbackBrand(): PublicBrand {
  return {
    companyName: brand.companyName,
    productName: brand.productName,
    tagline: brand.tagline,
    signal: brand.colors.signal,
    signalInk: brand.colors.signalInk,
  };
}

export async function publicBrand(): Promise<PublicBrand> {
  const base = fallbackBrand();
  try {
    const sql = await getSql();
    const rows = await sql<{
      brand_company: string;
      brand_product: string;
      brand_tagline: string;
      brand_signal: string;
    }>`
      select brand_company, brand_product, brand_tagline, brand_signal
      from station_settings where id = 1
    `;
    const row = rows[0];
    if (!row) return base;
    const signal = signalHex(row.brand_signal ?? "") ?? base.signal;
    return {
      companyName: row.brand_company?.trim() || base.companyName,
      productName: row.brand_product?.trim() || base.productName,
      tagline: row.brand_tagline?.trim() || base.tagline,
      signal,
      signalInk: signalInk(signal),
    };
  } catch {
    return base;
  }
}
