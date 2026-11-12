/** Lebende Marke. Leer gespeicherte Felder bleiben die mitgelieferte CI. */
import { useEffect, useState } from "react";
import { brand, signalHex, signalInk } from "@/brand";
import type { PublicBrand } from "@/lib/pulse/brand-public";

const initial: PublicBrand = {
  companyName: brand.companyName,
  productName: brand.productName,
  tagline: brand.tagline,
  signal: brand.colors.signal,
  signalInk: brand.colors.signalInk,
};

let current = initial;
const listeners = new Set<() => void>();

export function publishBrand(next: PublicBrand) {
  const signal = signalHex(next.signal) ?? brand.colors.signal;
  current = {
    companyName: next.companyName.trim() || brand.companyName,
    productName: next.productName.trim() || brand.productName,
    tagline: next.tagline.trim() || brand.tagline,
    signal,
    signalInk: signalInk(signal),
  };
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--brand-signal", current.signal);
    root.style.setProperty("--brand-signal-ink", current.signalInk);
    document.title = current.productName;
  }
  for (const listener of listeners) listener();
}

export function useLiveBrand(): PublicBrand {
  const [value, setValue] = useState(current);
  useEffect(() => {
    const pull = () => setValue(current);
    listeners.add(pull);
    pull();
    return () => {
      listeners.delete(pull);
    };
  }, []);
  return value;
}

export function BrandSync() {
  useEffect(() => {
    let stop = false;
    const pull = () => {
      void fetch("/api/brand")
        .then((res) => (res.ok ? (res.json() as Promise<PublicBrand>) : null))
        .then((body) => {
          if (!stop && body && typeof body.productName === "string") publishBrand(body);
        })
        .catch(() => undefined);
    };
    pull();
    window.addEventListener("focus", pull);
    return () => {
      stop = true;
      window.removeEventListener("focus", pull);
    };
  }, []);
  return null;
}
