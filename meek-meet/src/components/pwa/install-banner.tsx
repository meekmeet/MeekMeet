"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "mm-pwa-dismissed";
const SHOW_DELAY_MS = 8000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac; touch support gives it away
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * The banner is for phones and tablets only — a desktop visitor gets nothing.
 * The install copy ("keep it on your phone") makes no sense on a laptop, and
 * desktop Chrome fires beforeinstallprompt all the same.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isIos()) return true;
  return /Android|Mobile|Tablet/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * PWA install prompt — phones and tablets only. Registers the (cache-free)
 * service worker, then:
 *  - Android: captures `beforeinstallprompt` and offers a native one-tap
 *    install.
 *  - iOS (no programmatic install exists): shows Share → Add to Home Screen
 *    instructions instead.
 * Dismissal is remembered; the banner never shows when already installed.
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing just means no install prompt — never fatal.
      });
    }
  }, []);

  useEffect(() => {
    if (isInStandaloneMode() || !isMobileDevice()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Private mode — show the banner, dismissal just won't persist.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    const timer = setTimeout(() => {
      if (isIos()) {
        setIos(true);
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  // On non-iOS the banner appears the moment Chrome says install is possible
  // (after the same gentle delay, so it never interrupts the first read).
  useEffect(() => {
    if (!deferredPrompt) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Non-persistent dismissal is fine.
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the Meek Meet app"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-50 bg-parchment border border-border-warm rounded-2xl shadow-xl p-5 animate-in slide-in-from-bottom-4 fade-in duration-500"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss install banner"
        className="absolute top-3 right-3 text-charcoal-muted hover:text-charcoal transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="rounded-xl shrink-0"
        />
        <div>
          <p className="font-serif text-lg text-charcoal leading-snug mb-1">
            Keep Meek Meet on your phone
          </p>
          {ios ? (
            <p className="text-sm text-charcoal-muted leading-relaxed">
              Tap{" "}
              <Share className="inline w-4 h-4 -mt-0.5 text-terracotta" aria-label="Share" />{" "}
              <span className="font-medium text-charcoal">Share</span>, then{" "}
              <span className="font-medium text-charcoal">
                Add to Home Screen
              </span>{" "}
              — the circles, questions and Sacred Library, one tap away.
            </p>
          ) : (
            <>
              <p className="text-sm text-charcoal-muted leading-relaxed mb-3">
                The circles, questions and Sacred Library — one tap away, even
                before the app stores.
              </p>
              <button
                onClick={install}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm tracking-wide bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all duration-300"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
                Install
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
