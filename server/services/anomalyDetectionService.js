import Transaction from '../models/Transaction.js';

export class AnomalyDetectionService {
  /**
   * Check if a new or existing transaction is an anomaly
   */
  static async evaluateTransactionAnomaly(userId, amount, category, merchant) {
    if (amount <= 0 || !category) {
      return { isAnomaly: false, reason: '' };
    }

    // Look back 90 days for baseline
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const history = await Transaction.find({
      userId,
      type: 'expense',
      category,
      date: { $gte: ninetyDaysAgo },
    })
      .select('amount merchant date')
      .lean();

    if (history.length < 3) {
      // Not enough data for high confidence statistical bounds
      // Flag only if > 5000 and unusually large relative to typical spending
      if (amount >= 10000) {
        return {
          isAnomaly: true,
          reason: `Large transaction amount (₹${amount.toLocaleString()}) with limited historical baseline in ${category}.`,
        };
      }
      return { isAnomaly: false, reason: '' };
    }

    const amounts = history.map((t) => t.amount);
    const n = amounts.length;
    const mean = amounts.reduce((a, b) => a + b, 0) / n;

    // Standard deviation
    const variance = amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Threshold: 2.5 standard deviations above mean or > 3x the average
    const upperThreshold = mean + 2.5 * stdDev;
    const multipleThreshold = mean * 3.2;

    if (amount > Math.max(upperThreshold, multipleThreshold)) {
      const percentageAbove = Math.round(((amount - mean) / mean) * 100);
      return {
        isAnomaly: true,
        reason: `Amount is ${percentageAbove}% higher than your average ${category} transaction (Avg: ₹${Math.round(mean).toLocaleString()}).`,
      };
    }

    // Merchant specific check if merchant exists
    if (merchant) {
      const merchantHistory = history.filter(
        (t) => t.merchant && t.merchant.toLowerCase() === merchant.toLowerCase()
      );
      if (merchantHistory.length >= 2) {
        const merchantAvg = merchantHistory.reduce((a, b) => a + b.amount, 0) / merchantHistory.length;
        if (amount > merchantAvg * 3) {
          return {
            isAnomaly: true,
            reason: `Significantly higher than your usual ${merchant} purchases (Avg: ₹${Math.round(merchantAvg).toLocaleString()}).`,
          };
        }
      }
    }

    return { isAnomaly: false, reason: '' };
  }

  /**
   * Find all anomalies for a user in a given period
   */
  static async getAnomalies(userId, limit = 10) {
    return await Transaction.find({ userId, isAnomaly: true })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
  }
}

export default AnomalyDetectionService;
