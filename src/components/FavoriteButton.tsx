"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import {
  getCachedClientAuthenticated,
  isClientAuthenticated,
  subscribeClientAuth,
} from "@/lib/client-auth";
import {
  FAVORITES_EVENT,
  isFavorite,
  toggleFavorite,
} from "@/lib/favorites";

type FavoriteButtonProps = {
  productId: string;
  productName: string;
  className?: string;
};

export function FavoriteButton({
  productId,
  productName,
  className = "",
}: FavoriteButtonProps) {
  const [active, setActive] = useState(() =>
    typeof window !== "undefined" ? isFavorite(productId) : false,
  );
  const [loggedIn, setLoggedIn] = useState(
    () => getCachedClientAuthenticated() === true,
  );
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    function syncFavorites() {
      setActive(isFavorite(productId));
    }

    async function syncAuth() {
      setLoggedIn(await isClientAuthenticated());
    }

    syncFavorites();
    void syncAuth();
    window.addEventListener(FAVORITES_EVENT, syncFavorites);
    window.addEventListener("storage", syncFavorites);
    const unsubscribe = subscribeClientAuth(() => {
      void syncAuth();
    });
    return () => {
      window.removeEventListener(FAVORITES_EVENT, syncFavorites);
      window.removeEventListener("storage", syncFavorites);
      unsubscribe();
    };
  }, [productId]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const cached = getCachedClientAuthenticated();
    const allowed = loggedIn || cached === true;

    if (!allowed) {
      if (cached === false) {
        setLoginOpen(true);
        return;
      }

      // Auth not resolved yet – check once, then act (no wait when cache is warm).
      void isClientAuthenticated().then((ok) => {
        setLoggedIn(ok);
        if (!ok) {
          setLoginOpen(true);
          return;
        }
        setActive(toggleFavorite(productId));
      });
      return;
    }

    setLoggedIn(true);
    setActive(toggleFavorite(productId));
  }

  const filled = loggedIn && active;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={filled}
        aria-label={
          filled
            ? `Odstrániť ${productName} z obľúbených`
            : `Pridať ${productName} do obľúbených`
        }
        className={`group/fav inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#2f2924]/55 shadow-[0_2px_10px_rgba(47,41,36,0.12)] backdrop-blur-sm transition-colors duration-100 hover:bg-white hover:text-[#c45c4a] ${
          filled ? "text-[#c45c4a]" : ""
        } ${className}`}
      >
        <Heart
          className={`size-4 transition-transform duration-100 group-hover/fav:scale-110 ${
            filled ? "fill-current" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      <LoginRequiredModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
