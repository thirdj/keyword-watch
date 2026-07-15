const CHECKS_PER_MONTH = (intervalMin: number) => {
  const checksPerDay = (24 * 60) / intervalMin;
  return Math.round(checksPerDay * 30);
};

export function estimateMonthlyUsage(intervalMin: number, activeKeywordCount: number) {
  const perKeyword = CHECKS_PER_MONTH(intervalMin);
  const total = perKeyword * activeKeywordCount;
  const freeLimit = 1000; // Tavily 무료 한도

  return {
    perKeyword,
    total,
    freeLimit,
    percentOfLimit: Math.round((total / freeLimit) * 100),
    exceedsLimit: total > freeLimit,
  };
}
