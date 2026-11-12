/** Dieses Gerät meldet sich, damit die Regie es benennen und einem Bereich zuordnen kann. */
import { useEffect, useRef, useState } from "react";
import { touchDevice } from "@/lib/pulse/api";
import type { DeviceTouch } from "@/lib/pulse/types";

const KEY = "pulse-device";

export function deviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(KEY) ?? "";
  if (/^[a-z0-9-]{8,80}$/.test(existing)) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(KEY, next);
  return next;
}

export function useArea(room: "sendung" | "pult" | "regie", hearing: boolean) {
  const detailRef = useRef("");
  const [beat, setBeat] = useState<DeviceTouch | null>(null);
  const [link, setLink] = useState("verbunden");
  const [id, setId] = useState("");

  useEffect(() => {
    const next = deviceId();
    setId(next);
    if (!next) return;
    let stop = false;
    const send = async () => {
      try {
        const touch = await touchDevice({
          data: {
            id: next,
            room,
            hearing,
            userAgent: navigator.userAgent,
            detail: detailRef.current,
          },
        });
        if (!stop) {
          setBeat(touch);
          setLink("verbunden");
        }
      } catch {
        if (!stop) setLink("keine Antwort");
      }
    };
    void send();
    const timer = window.setInterval(() => void send(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [room, hearing]);

  return { beat, link, detailRef, id };
}
