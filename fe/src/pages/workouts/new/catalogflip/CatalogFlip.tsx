import { useEffect, useState } from "react";
import "./style.css";

export type CatalogFlipProps = {
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
  variant?: "thumb" | "hero";
};

export function CatalogFlip({
  imageUrl,
  imageUrlEnd,
  variant = "thumb",
}: CatalogFlipProps) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [failed, setFailed] = useState(false);
  const startUrl = imageUrl?.trim() || null;
  const endUrl = imageUrlEnd?.trim() || null;
  const src = frame === 1 && endUrl ? endUrl : startUrl ?? endUrl;
  const canFlip = Boolean(startUrl && endUrl);

  useEffect(() => {
    if (!canFlip) {
      return;
    }

    const timer = window.setInterval(() => {
      setFrame((current) => (current === 0 ? 1 : 0));
    }, 900);

    return () => window.clearInterval(timer);
  }, [canFlip]);

  if (!src || failed) {
    return (
      <span
        className={`catalog-flip catalog-flip--${variant} catalog-flip--empty`}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={`catalog-flip catalog-flip--${variant}`} aria-hidden="true">
      {startUrl && endUrl ? (
        <>
          <img src={startUrl} alt="" hidden={frame !== 0} onError={() => setFailed(true)} />
          <img src={endUrl} alt="" hidden={frame !== 1} onError={() => setFailed(true)} />
        </>
      ) : (
        <img src={src} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
