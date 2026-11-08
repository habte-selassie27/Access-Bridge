import { parseEthiopianDate } from "./ethiopian";

// Approximate conversion: Ethiopian -> Gregorian.
// Ethiopian new year (1 Meskerem) falls on Sep 11 (or Sep 12 in Gregorian leap years).
// We convert by computing days since Ethiopian epoch and adding to Gregorian epoch.
export function ethiopianToGregorianApprox(text: string): { ethiopian: string; gregorian: string; approximate: boolean } | null {
  const eth = parseEthiopianDate(text);
  if (!eth) return null;
  // Days from Ethiopian epoch (1 Meskerem 1 EC) to the given date.
  const daysInEthYear = (y: number) => (y % 4 === 3 ? 366 : 365);
  let days = 0;
  for (let y = 1; y < eth.year; y++) days += daysInEthYear(y);
  // months 1..12 have 30 days; Pagume (13) has 5/6
  for (let m = 1; m < eth.month; m++) days += (m <= 12 ? 30 : (eth.year % 4 === 3 ? 6 : 5));
  days += eth.day - 1;
  // Ethiopian epoch 1 Meskerem 1 EC = Sep 11, 8 AD (Julian) = Sep 11 (Gregorian proleptic approx).
  // Use a fixed offset of 1723856 JDN for 1 Meskerem 1 EC.
  const jdn = 1723856 + days;
  // Convert JDN to Gregorian.
  const g = jdnToGregorian(jdn);
  const ethStr = `${eth.day} ${["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miazia","Ginbot","Sene","Hamle","Nehase","Pagume"][eth.month-1]} ${eth.year} E.C.`;
  return { ethiopian: ethStr, gregorian: g, approximate: true };
}

function jdnToGregorian(jdn: number): string {
  const l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
