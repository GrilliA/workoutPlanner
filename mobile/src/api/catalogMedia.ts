const CATALOG_MEDIA_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export function deriveImageUrlEnd(imageUrl: string | null | undefined): string | null {
  if (typeof imageUrl !== "string" || imageUrl.length === 0) {
    return null;
  }

  if (!/\/0\.jpg(?:\?.*)?$/i.test(imageUrl)) {
    return null;
  }

  return imageUrl.replace(/\/0\.jpg/i, "/1.jpg");
}

/** Catalog ids are the free-exercise-db folder names; photos work without the catalog API. */
export function catalogImageUrlsFromId(catalogId: string): {
  imageUrl: string;
  imageUrlEnd: string;
} {
  const folder = encodeURIComponent(catalogId);
  return {
    imageUrl: `${CATALOG_MEDIA_BASE}/${folder}/0.jpg`,
    imageUrlEnd: `${CATALOG_MEDIA_BASE}/${folder}/1.jpg`,
  };
}
