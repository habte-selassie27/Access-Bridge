let dailySpend = 0;
let dailyReset = Date.now() + 86_400_000;

export function getDailySpend(): number {
  if (Date.now() > dailyReset) {
    dailySpend = 0;
    dailyReset = Date.now() + 86_400_000;
  }
  return dailySpend;
}
export function addSpend(amount: number): void {
  getDailySpend();
  dailySpend += amount;
}
export function canSpend(cap: number): boolean {
  return getDailySpend() < cap;
}
