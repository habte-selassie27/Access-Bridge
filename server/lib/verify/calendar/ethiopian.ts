export interface EthDate { day: number; month: number; year: number; }

const ETH_MONTHS = ["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miazia","Ginbot","Sene","Hamle","Nehase","Pagume"];

export function ethMonthName(m: number): string {
  return ETH_MONTHS[m - 1] || "";
}

export function isEthiopianDate(text: string): boolean {
  return ETH_MONTHS.some((m) => new RegExp(m, "i").test(text));
}

export function parseEthiopianDate(text: string): EthDate | null {
  const m = text.match(/(\d{1,2})\s+(Meskerem|Tikimt|Hidar|Tahsas|Tir|Yekatit|Megabit|Miazia|Ginbot|Sene|Hamle|Nehase|Pagume)\s+(\d{4})/i);
  if (!m) return null;
  const monthIdx = ETH_MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) + 1;
  return { day: Number(m[1]), month: monthIdx, year: Number(m[3]) };
}
