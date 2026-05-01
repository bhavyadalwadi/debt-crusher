export interface InstitutionOption {
  label: string;
  keywords: string[];
}

export const CREDIT_CARD_INSTITUTIONS: InstitutionOption[] = [
  { label: "American Express", keywords: ["amex", "american express"] },
  { label: "Bank of America", keywords: ["bank of america", "bofa", "boa"] },
  { label: "Barclays", keywords: ["barclays"] },
  { label: "Capital One", keywords: ["capital one", "cap one", "capitalone"] },
  { label: "Chase", keywords: ["chase", "jp morgan", "jpmorgan"] },
  { label: "Citi", keywords: ["citi", "citibank"] },
  { label: "Discover", keywords: ["discover"] },
  { label: "Fidelity", keywords: ["fidelity", "elan"] },
  { label: "Goldman Sachs", keywords: ["goldman", "goldman sachs", "gs"] },
  { label: "Navy Federal", keywords: ["navy federal", "nfcu"] },
  { label: "PNC", keywords: ["pnc"] },
  { label: "Synchrony", keywords: ["synchrony"] },
  { label: "US Bank", keywords: ["us bank", "u.s. bank", "usb"] },
  { label: "Wells Fargo", keywords: ["wells fargo", "wells"] },
];

export const CASH_ACCOUNT_INSTITUTIONS: InstitutionOption[] = [
  { label: "Ally", keywords: ["ally"] },
  { label: "American Express", keywords: ["amex", "american express"] },
  { label: "Bank of America", keywords: ["bank of america", "bofa", "boa"] },
  { label: "BMO", keywords: ["bmo", "bank of montreal"] },
  { label: "Capital One", keywords: ["capital one", "cap one", "capitalone"] },
  { label: "Charles Schwab", keywords: ["schwab", "charles schwab"] },
  { label: "Chase", keywords: ["chase", "jp morgan", "jpmorgan"] },
  { label: "Citi", keywords: ["citi", "citibank"] },
  { label: "Discover", keywords: ["discover"] },
  { label: "Fidelity", keywords: ["fidelity"] },
  { label: "Marcus", keywords: ["marcus", "goldman", "goldman sachs"] },
  { label: "PNC", keywords: ["pnc"] },
  { label: "SoFi", keywords: ["sofi", "social finance"] },
  { label: "US Bank", keywords: ["us bank", "u.s. bank", "usb"] },
  { label: "Wells Fargo", keywords: ["wells fargo", "wells"] },
];
