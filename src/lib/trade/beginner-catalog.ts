export const COFFEE_EXAMPLE = "adeafe3bcd853d59cbf52202e620a6d6fe3bfea187112d46929d0ba50cc8ec9e";

export const PRODUCT_GROUPS = [
  { name: "Coffee and cocoa", image: "/trade/cacao.webp", codes: ["090111", "180400", "180500"] },
  { name: "Palm oil and rubber", image: "/trade/palm.webp", codes: ["151110", "151190", "400122", "401110"] },
  { name: "Clothing, footwear and furniture", image: "/trade/textiles.webp", codes: ["610910", "620342", "640399", "640411", "940360"] },
];

export const TRADE_SOURCES = {
  comtrade: { label: "UN Comtrade trade statistics", href: "https://comtradeplus.un.org/" },
  methodology: { label: "Ranking methodology", href: "/methodology" },
  exim: { label: "Export requirements (Kemendag EXIM)", href: "https://exim.kemendag.go.id/" },
  inaexport: { label: "Supplier registration (Inaexport)", href: "https://sip.kemendag.go.id/inaexport" },
};

export function normalizeTradeText(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}
