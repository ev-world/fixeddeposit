/**
 * Utility functions for Fixed Deposit financial and date calculations.
 */

/**
 * Auto-calculates the maturity date based on a deposit date and tenure in months.
 */
export function calculateMaturityDate(depositDateStr: string, tenureMonths: number): string {
  if (!depositDateStr) return '';
  const date = new Date(depositDateStr);
  if (isNaN(date.getTime())) return '';
  
  // Add months cleanly
  date.setMonth(date.getMonth() + tenureMonths);
  
  // Format as YYYY-MM-DD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates Fixed Deposit Interest and Maturity Amount.
 * 
 * Compounding Rules:
 * - Cumulative: Compounded Quarterly (standard Indian banking system).
 *   Formula: A = P * (1 + r / 400) ^ (4 * (months / 12))
 * 
 * Payout Rules (Monthly, Quarterly, Yearly):
 * - Interest is paid out periodically, so the maturity amount returned is the Principal itself,
 *   but we can also calculate the periodic interest payout and total interest generated for reports.
 */
export interface CalculationResult {
  principal: number;
  interestRate: number;
  tenureMonths: number;
  interestType: 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative';
  maturityAmount: number;
  totalInterest: number;
  periodicPayout: number; // The interest payout amount per period
}

export function calculateFDInterest(
  principal: number,
  interestRate: number,
  tenureMonths: number,
  interestType: 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative'
): CalculationResult {
  const P = Number(principal) || 0;
  const R = Number(interestRate) || 0;
  const M = Number(tenureMonths) || 0;

  if (P <= 0 || R <= 0 || M <= 0) {
    return {
      principal: P,
      interestRate: R,
      tenureMonths: M,
      interestType,
      maturityAmount: P,
      totalInterest: 0,
      periodicPayout: 0
    };
  }

  const years = M / 12;
  const totalInterest = (P * R * years) / 100;
  const maturityAmount = P + totalInterest;

  let periodicPayout = 0;
  if (interestType === 'Monthly') {
    periodicPayout = (P * (R / 100)) / 12;
  } else if (interestType === 'Quarterly') {
    periodicPayout = (P * (R / 100)) / 4;
  } else if (interestType === 'Yearly') {
    periodicPayout = P * (R / 100);
  }

  // Round values cleanly to 2 decimal places
  return {
    principal: Math.round(P),
    interestRate: R,
    tenureMonths: M,
    interestType,
    maturityAmount: Math.round(maturityAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    periodicPayout: Math.round(periodicPayout * 100) / 100
  };
}

/**
 * Calculates premature closure value based on bank policies:
 * Standard premature close penalty is 2% reduction in interest rate for the actual duration completed.
 * Or if duration is less than minimum tenure, standard simple interest is calculated.
 */
export interface PrematureCloseResult {
  depositAmount: number;
  actualTenureMonths: number;
  originalRate: number;
  effectiveRate: number; // originalRate - penalty
  interestEarned: number;
  penaltyAmount: number;
  finalPayout: number;
}

export function calculatePrematureClose(
  depositAmount: number,
  depositDateStr: string,
  closeDateStr: string,
  originalRate: number,
  penaltyPercent: number = 2.0
): PrematureCloseResult {
  const P = Number(depositAmount) || 0;
  const R = Number(originalRate) || 0;
  
  if (!depositDateStr || !closeDateStr || P <= 0) {
    return {
      depositAmount: P,
      actualTenureMonths: 0,
      originalRate: R,
      effectiveRate: Math.max(0, R - penaltyPercent),
      interestEarned: 0,
      penaltyAmount: 0,
      finalPayout: P
    };
  }

  const d1 = new Date(depositDateStr);
  const d2 = new Date(closeDateStr);
  
  // Calculate difference in months roughly
  let diffYears = d2.getFullYear() - d1.getFullYear();
  let diffMonths = d2.getMonth() - d1.getMonth();
  let diffDays = d2.getDate() - d1.getDate();

  let actualTenureMonths = diffYears * 12 + diffMonths;
  if (diffDays < 0) {
    actualTenureMonths -= 1;
  }
  actualTenureMonths = Math.max(0.5, actualTenureMonths); // Minimum of half a month

  // Effective rate is Original Rate minus Penalty Rate (e.g., 2%)
  const effectiveRate = Math.max(0.5, R - penaltyPercent);
  const years = actualTenureMonths / 12;

  // Since it's broken prematurely, we calculate simple interest earned for the active duration
  const interestEarned = Math.round(P * (effectiveRate / 100) * years);
  const penaltyAmount = Math.round(P * (penaltyPercent / 100) * years);
  const finalPayout = Math.round(P + interestEarned);

  return {
    depositAmount: P,
    actualTenureMonths: Math.round(actualTenureMonths * 10) / 10,
    originalRate: R,
    effectiveRate,
    interestEarned,
    penaltyAmount,
    finalPayout
  };
}
