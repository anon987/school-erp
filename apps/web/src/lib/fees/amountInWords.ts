const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens]! : `${TENS[tens]} ${ONES[ones]}`;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return twoDigits(rest);
  const hundredPart = `${ONES[hundreds]} Hundred`;
  return rest === 0 ? hundredPart : `${hundredPart} ${twoDigits(rest)}`;
}

/** Indian numbering (thousand / lakh / crore), not the Western thousand/million/billion grouping. */
function wholeNumberInWords(n: number): string {
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1_000);
  const hundred = n % 1_000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(threeDigits(hundred));
  return parts.join(" ");
}

/** "Seventeen Thousand Seven Hundred Forty-Four Rupees Only" (or "... and Fifty Paise Only" if paise > 0). */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainderPaise = paise % 100;

  const rupeeWords = `${wholeNumberInWords(rupees)} Rupee${rupees === 1 ? "" : "s"}`;
  if (remainderPaise === 0) return `${rupeeWords} Only`;

  const paiseWords = `${wholeNumberInWords(remainderPaise)} Paise`;
  return `${rupeeWords} and ${paiseWords} Only`;
}
