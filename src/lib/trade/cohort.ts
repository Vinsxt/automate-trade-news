export const REFERENCE_YEAR = 2025;
export const COHORT_PERIODS = ["2022", "2023", "2024", "2025"] as const;

export const PRODUCTS: Record<string, string> = {
  "090111": "Unroasted, non-decaffeinated coffee",
  "151110": "Crude palm oil", "151190": "Other palm oil and fractions",
  "180400": "Cocoa butter, fat and oil", "180500": "Unsweetened cocoa powder",
  "400122": "Technically specified natural rubber", "401110": "New passenger-car tyres",
  "640399": "Other leather-upper footwear", "640411": "Textile-upper sports footwear",
  "940360": "Other wooden furniture", "610910": "Knitted cotton T-shirts and vests",
  "620342": "Men’s or boys’ woven cotton trousers and related garments",
};

export const MARKETS: Record<number, string> = {
  36: "Australia", 156: "China", 276: "Germany", 392: "Japan", 528: "Netherlands",
  699: "India", 702: "Singapore", 784: "United Arab Emirates", 826: "United Kingdom", 842: "United States",
};
