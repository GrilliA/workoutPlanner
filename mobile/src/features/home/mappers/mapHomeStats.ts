/** Kg compatti: 950 → "950", 12 400 → "12.4k". Usato anche da Progressi. */
export const formatKgValue = (kg: number): string => {
  if (kg <= 0) {
    return "0";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k`;
  }

  return String(Math.round(kg));
};
