import { normalizeTradeText, TRADE_SOURCES } from "./beginner-catalog";
import { annualFinding, metric, usd, type BeginnerMarket } from "./beginner-market";
import { MARKETS, PRODUCTS } from "./cohort";

const alternateNames: Record<number, string[]> = {
  156: ["china", "cina", "tionghoa"], 784: ["uea", "uae"],
  826: ["inggris", "uk", "united kingdom"], 842: ["usa", "amerika"],
};

const sources = TRADE_SOURCES;

export function answerBeginnerQuestion(input: {
  question: string;
  selection?: { text: string; reporter?: number };
  markets: BeginnerMarket[];
  hs6: string;
  period: string;
  snapshot: string;
}) {
  const { markets, selection, hs6, snapshot } = input;
  const question = normalizeTradeText(input.question);
  const text = normalizeTradeText(selection?.text ?? "");
  const combined = `${question} ${text}`;
  const mentions = (term: string, inText: string) => ` ${inText} `.includes(` ${normalizeTradeText(term)} `);
  const named = (inText: string) => Object.keys(MARKETS).map(Number).filter(code =>
    [MARKETS[code], ...(alternateNames[code] ?? [])].some(name => mentions(name, inText)));
  const requested = named(question);
  if (/\b(?:US|AS)\b(?!\$)/.test(input.question) && !requested.includes(842)) requested.push(842);
  const marketCodes = requested.length ? requested : selection?.reporter ? [selection.reporter] : named(text);
  const active = marketCodes.length ? markets.filter(market => marketCodes.includes(market.row.reporter)) : markets;
  const yearPattern = /\b(?:19|20)\d{2}\b/g;
  const yearsMentioned = [...new Set(question.match(yearPattern) ?? [])];
  const recent = /\b(sekarang|saat ini|terbaru|right now|latest)\b/.test(question);
  const latest = active[0]?.years.findLast(item => active.some(market => market.years.some(year => year.period === item.period && year.importValue !== null)))?.period;
  const period = yearsMentioned.length === 1 ? yearsMentioned[0] : recent ? latest ?? input.period : input.period;
  const result = (lines: string[], links = [sources.comtrade, sources.methodology]) => ({ lines, links });
  const otherProduct = Object.keys(PRODUCTS).some(code => code !== hs6 && mentions(code, question));
  const yearOutside = yearsMentioned.some(year => !active.every(market => market.years.some(item => item.period === year)));
  if (otherProduct) return result(["Choose the product’s HS category to ask questions about its release."], [{ label: "Browse products", href: "/#products" }]);
  if (hs6 === "090111" && /\b(kopi sangrai|roasted coffee|kopi bubuk|kopi instan|kopi dekaf|decaf coffee|instant coffee|ground coffee)\b/.test(question) &&
    !/\b(tidak|bukan|belum|unroasted)\b/.test(question)) {
    return result(["HS 090111 covers unroasted, non-decaffeinated coffee. The coffee form you asked about is outside this release."]);
  }
  if (marketCodes.some(code => !markets.some(market => market.row.reporter === code))) {
    return result(["Choose that country in the market filters, then ask again."], []);
  }
  if (yearOutside || /\b(bulan ini|bulan lalu|hari ini|this month|today|monthly|bulanan)\b/.test(question)) {
    return result([`This release covers annual data for ${markets[0]?.years[0]?.period ?? ""}–${markets[0]?.years.at(-1)?.period ?? ""}. The period you asked about is outside this release.`]);
  }
  if (yearsMentioned.length > 1 && !/\b(tren|riwayat|tahun ke tahun|trend|trends|changed over time|history)\b/.test(combined)) {
    return result(["Choose one year for this question, or ask about import history to see all years in the release."], []);
  }
  if (/\b(siapa pembeli(nya)?|nama pembeli|daftar (perusahaan|pembeli)|nama perusahaan|perusahaan pesaing|harga jual|harga kopi|margin|keuntungan|profit|buyer contacts|company names|who are the buyers|selling price|price forecast)\b/.test(question)) {
    return result(["This release covers import values by supplier country or territory. Buyer names, transaction prices and margins require separate research."], [sources.inaexport, sources.comtrade]);
  }
  const links = [...active.map(market => ({
    label: `${market.name} evidence · HS ${hs6} · through ${period}`,
    href: `/rankings/${hs6}/${market.row.reporter}?snapshot=${snapshot}&to=${period}`,
  })), sources.comtrade];
  const history = /\b(tren|riwayat|tahun ke tahun|beberapa tahun|trend|trends|changed over time|history|historical)\b/.test(combined);
  const suppliers = /\b(pesaing|kompetitor|pemasok|pasokan|supplier|suppliers|competitor|competitors|kompetisi)\b/.test(combined);
  const share = /\b(pangsa|share|poin persentase|percentage points|pp)\b/.test(combined);
  const rank = /\b(skor|peringkat|urutan|score|ranking)\b/.test(combined);
  const potential = /\b(peluang|potensi|masuk pasar|layak|pilih pasar|market potential|opportunity|can i sell)\b/.test(combined);
  const action = /\b(syarat|persyaratan|prosedur|daftar|spesifikasi|lot|sampel|requirements|regulation|register|inaexport)\b/.test(combined);
  const importValue = /\b(impor|imports?|imported|year on year|value|annual growth|nilai|pertumbuhan|naik|turun|growth|harga|jumlah|volume)\b/.test(combined);
  if (!history && !suppliers && !potential &&
    /\b(annualized|annual growth|share change)\b/.test(selection ? combined : question) &&
    (selection || yearsMentioned.length === 0)) {
    const shareChange = /\bshare change\b/.test(combined);
    return result(active.map(({ name, row }) => {
      const value = shareChange ? row.components?.indonesiaShareGain : row.components?.importGrowth;
      const label = shareChange ? "Indonesia’s share change" : "Annualized import growth";
      const range = `${row.referenceYear - 3}–${row.referenceYear}`;
      return `${label} in ${name} over ${range}: ${metric(value ?? null, shareChange ? " percentage points" : "% per year", true)}.`;
    }), [...links, sources.methodology]);
  }
  if (/\b(apa yang (bisa|dapat) saya jual|produk apa|what can i sell|what products)\b/.test(question)) {
    return result([`You’re viewing ${PRODUCTS[hs6]} (HS ${hs6}). Start with a product you can supply and confirm its form, quality, quantity and delivery timing. Browse the catalog to compare markets by product.`], [{ label: "Product catalog", href: "/#products" }, sources.exim]);
  }
  if (action && !suppliers && !history && !potential) {
    return result([
      `Prepare a specification for HS ${hs6}, available quantities and sample timing. Enter the HS code and destination in Kemendag EXIM to check procedures.`,
      "Inaexport provides supplier registration information. Confirm buyer needs and product requirements before shipping.",
    ], [sources.exim, sources.inaexport]);
  }
  if (rank) {
    return result([
      ...active.map(market => market.rank === null ? `${market.name} is unranked. ${market.exclusion ?? ""}` :
        `${market.name} ranked ${market.rank}${market.tied ? " (tie)" : ""} of ${market.row.eligibleCount} comparable markets for ${market.years[0].period}–${market.row.referenceYear}.`),
      "The score combines import value, annualized import growth and the change in Indonesia’s share. Use it to prioritize research within this product.",
    ], [...links, sources.methodology]);
  }
  if (history || share || suppliers || potential || importValue) {
    const lines = active.flatMap(market => {
      const year = market.years.find(item => item.period === period);
      if (!year || !market.available) return [`Annual records for ${market.name} are unavailable.`];
      const parts: string[] = [];
      if (history) {
        parts.push(`${market.name} import value (USD). ${market.years.map(item => `${item.period} ${item.importValue === null ? "unavailable" : usd(item.importValue)}`).join(", ")}.`);
      } else if (potential || (importValue && !share && !suppliers)) {
        parts.push(annualFinding(market.name, year));
      }
      if (share || potential) {
        parts.push(year.indonesiaShare === null ? `Indonesia’s share in ${market.name} is unavailable for ${period}.` :
          `Indonesia’s share in ${market.name} in ${period} was ${metric(year.indonesiaShare, "%")}${year.indonesiaChange === null ? "" : `, a change of ${metric(year.indonesiaChange, " percentage points", true)} from ${Number(period) - 1}`}.`);
      }
      if (suppliers) {
        const gaining = /\b(naik|bertambah|gained|gain)\b/.test(combined);
        const selected = gaining ? year.gainingSuppliers : year.suppliers;
        parts.push(selected.length ? `${gaining ? "Largest measured supplier share gains" : "Largest identified suppliers"} in ${market.name} in ${period}. ${selected.map(supplier => `${supplier.name} (${gaining ? metric(supplier.change, " percentage points", true) : usd(supplier.importValue)})`).join(", ")}.` :
          `${gaining ? "Measured supplier share gains" : "Supplier details"} are unavailable in ${market.name} in ${period}.`);
      }
      return parts;
    });
    if (share) lines.push("One percentage point represents US$1 per US$100 of import value.");
    if (suppliers) lines.push("These figures identify supplier countries and territories. Use separate sources to look up companies and buyers.");
    if (potential) lines.push("Use market size and Indonesia’s share to prioritize research. Check buyer specifications, your supply capacity and destination procedures before estimating sales potential.");
    if (history || importValue || potential) lines.push("Import values can change with prices, quantities, or both.");
    return result(lines, [...links, ...(potential ? [sources.exim, sources.inaexport] : [sources.methodology])]);
  }
  return result(["Try asking “Who are the largest suppliers?” or “How have imports changed over time?”"], []);
}
