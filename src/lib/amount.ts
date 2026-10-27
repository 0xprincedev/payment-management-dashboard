function plainAmount(cents: number) {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;
  let text = String(whole);
  if (fraction !== 0) {
    text += fraction % 10 === 0 ? `.${fraction / 10}` : `.${String(fraction).padStart(2, "0")}`;
  }
  return negative ? `-${text}` : text;
}

export function formatAmount(cents: number) {
  const plain = plainAmount(cents);
  const negative = plain.startsWith("-");
  const [whole, fraction] = plain.slice(negative ? 1 : 0).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = fraction ? `${grouped}.${fraction}` : grouped;
  return negative ? `-${text}` : text;
}

export function formatAmountInput(cents: number) {
  return plainAmount(cents);
}
