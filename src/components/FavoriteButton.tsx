"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import {
  CLIENT_AUTH_EVENT,
  isClientAuthenticated,
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
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    function syncFavorites() {
      setActive(isFavorite(productId));
      setHydrated(true);
    }

    function syncAuth() {
      setLoggedIn(isClientAuthenticated());
    }

    syncFavorites();
    syncAuth();
    window.addEventListener(FAVORITES_EVENT, syncFavorites);
    window.addEventListener(CLIENT_AUTH_EVENT, syncAuth);
    window.addEventListener("storage", syncFavorites);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, syncFavorites);
      window.removeEventListener(CLIENT_AUTH_EVENT, syncAuth);
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener("storage", syncAuth);
    };
  }, [productId]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isClientAuthenticated()) {
      setLoginOpen(true);
      return;
    }

    setActive(toggleFavorite(productId));
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={loggedIn && active}
        aria-label={
          loggedIn && active
            ? `Odstrániť ${productName} z obľúbených`
            : `Pridať ${productName} do obľúbených`
        }
        className={`group/fav inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#2f2924]/55 shadow-[0_2px_10px_rgba(47,41,36,0.12)] backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white hover:text-[#c45c4a] ${
          hydrated && loggedIn && active ? "text-[#c45c4a]" : ""
        } ${className}`}
      >
        <Heart
          className={`size-4 transition-transform duration-200 group-hover/fav:scale-110 ${
            hydrated && loggedIn && active ? "fill-current" : ""
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
