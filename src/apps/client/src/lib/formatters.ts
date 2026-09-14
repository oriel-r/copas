export function formatCurrency(amount: number | null | undefined, currency = 'ARS'): string {
  if (amount == null || Number.isNaN(amount)) {
    amount = 0;
  }
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return formatted.replace(/\u00A0/g, ' ');
}
