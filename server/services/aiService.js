import dotenv from 'dotenv';
dotenv.config();

const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';

// Deterministic Merchant Rules (Fast & 100% reliable)
const MERCHANT_RULES = [
  { keywords: ['swiggy', 'zomato', 'restaurant', 'mcdonalds', 'kfc', 'starbucks', 'dominos', 'burger', 'cafe', 'diner', 'pizza', 'food', 'groceries', 'supermarket', 'blinkit', 'zepto', 'instamart', 'bigbasket'], category: 'Food' },
  { keywords: ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'bus', 'train', 'flight', 'irctc', 'indigo', 'air india', 'toll', 'parking', 'cab'], category: 'Transport' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'shopping', 'clothing', 'ajio', 'meesho', 'shoes', 'electronics'], category: 'Shopping' },
  { keywords: ['netflix', 'spotify', 'prime video', 'hotstar', 'youtube premium', 'apple music', 'disney', 'playstation', 'steam', 'crunchyroll'], category: 'Subscriptions' },
  { keywords: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'airtel', 'jio', 'vi', 'utility', 'maintenance', 'recharge', 'bill'], category: 'Bills' },
  { keywords: ['rent', 'landlord', 'housing', 'pg', 'flat'], category: 'Rent' },
  { keywords: ['pharmacy', 'apollo', 'hospital', 'doctor', 'clinic', 'medicine', 'gym', 'cult', 'fitness', 'dental'], category: 'Health' },
  { keywords: ['cinema', 'pvr', 'inox', 'movie', 'concert', 'gaming', 'bar', 'club', 'bowling'], category: 'Entertainment' },
  { keywords: ['hotel', 'airbnb', 'makemytrip', 'booking.com', 'resort', 'vacation', 'trip'], category: 'Travel' },
  { keywords: ['course', 'udemy', 'coursera', 'tuition', 'books', 'school', 'college', 'exam', 'fees'], category: 'Education' },
  { keywords: ['zerodha', 'groww', 'mutual fund', 'stocks', 'crypto', 'sip', 'gold'], category: 'Investments' },
];

export class AIService {
  /**
   * Safe helper to call Gemini API if key is present
   */
  static async callGemini(prompt, systemInstruction = '') {
    if (!AI_API_KEY) {
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;
      const payload = {
        contents: [
          ...(systemInstruction ? [{ role: 'user', parts: [{ text: systemInstruction }] }, { role: 'model', parts: [{ text: 'Understood. I will strictly follow these financial analysis constraints.' }] }] : []),
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`[Gemini API] Returned status ${res.status}: ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
      console.warn('[Gemini API] Call failed, using intelligent fallback:', e.message);
      return null;
    }
  }

  /**
   * Deterministic + AI Categorization
   */
  static async categorizeTransaction(merchant = '', description = '', amount = 0) {
    const textToMatch = `${merchant} ${description}`.toLowerCase();

    // 1. Check deterministic keyword rules
    for (const rule of MERCHANT_RULES) {
      if (rule.keywords.some((kw) => textToMatch.includes(kw))) {
        return { category: rule.category, confidence: 0.95, method: 'deterministic_rule' };
      }
    }

    // 2. If ambiguous and AI is available, ask AI
    if (AI_API_KEY) {
      const prompt = `Categorize this transaction into exactly ONE of these categories: [Food, Transport, Shopping, Bills, Rent, Education, Health, Entertainment, Travel, Subscriptions, Personal, Investments, Other].
Merchant/Item: "${merchant}"
Description: "${description}"
Amount: ${amount}
Output ONLY JSON in this format: {"category": "CategoryName", "subcategory": "optional subcategory"}`;

      const aiResponse = await this.callGemini(prompt);
      if (aiResponse) {
        try {
          const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return { category: parsed.category || 'Other', subcategory: parsed.subcategory || '', confidence: 0.85, method: 'ai' };
        } catch (e) {
          // ignore parse error and fallback
        }
      }
    }

    return { category: 'Other', subcategory: '', confidence: 0.5, method: 'fallback' };
  }

  /**
   * Natural Language Expense Extraction
   * Example: "Spent 450 on dinner with friends yesterday"
   */
  static async extractExpense(text, userCurrency = 'INR') {
    if (!text || typeof text !== 'string') {
      return { success: false, message: 'Invalid input text' };
    }

    // Try AI first for nuanced understanding
    if (AI_API_KEY) {
      const prompt = `Extract expense details from this user input: "${text}"
Current date reference: ${new Date().toISOString().split('T')[0]}
User currency: ${userCurrency}

Valid categories: Food, Transport, Shopping, Bills, Rent, Education, Health, Entertainment, Travel, Subscriptions, Personal, Investments, Other.

Return ONLY a JSON object with this exact schema:
{
  "amount": number,
  "category": string,
  "subcategory": string,
  "merchant": string,
  "description": string,
  "date": "YYYY-MM-DD",
  "paymentMethod": "UPI" | "Credit Card" | "Debit Card" | "Net Banking" | "Cash" | "Wallet" | "Other"
}`;

      const aiResult = await this.callGemini(prompt);
      if (aiResult) {
        try {
          const cleanJson = aiResult.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.amount && parsed.category) {
            return {
              success: true,
              data: {
                amount: Number(parsed.amount),
                category: parsed.category,
                subcategory: parsed.subcategory || '',
                merchant: parsed.merchant || '',
                description: parsed.description || text,
                date: parsed.date || new Date().toISOString().split('T')[0],
                paymentMethod: parsed.paymentMethod || 'UPI',
              },
            };
          }
        } catch (e) {
          // Fall through to regex rule parser
        }
      }
    }

    // Fallback Deterministic Regex Parser
    const amountMatch = text.match(/(?:rs\.?|inr|₹|\$|€|£)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    let category = 'Other';
    const textLower = text.toLowerCase();
    for (const rule of MERCHANT_RULES) {
      if (rule.keywords.some((kw) => textLower.includes(kw))) {
        category = rule.category;
        break;
      }
    }

    return {
      success: amount > 0,
      data: {
        amount,
        category,
        subcategory: '',
        merchant: '',
        description: text,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
      },
    };
  }

  /**
   * AI Financial Chatbot (Ground Truth Context Enforced)
   */
  static async answerFinancialQuestion(question, contextData, chatHistory = []) {
    const systemInstruction = `You are "SpendFlow AI Coach", a friendly, mathematically rigorous personal finance advisor.
CRITICAL RULES:
1. ONLY reference and use the exact calculated financial numbers provided in the CONTEXT below.
2. DO NOT make up or hallucinate financial figures, balances, or transactions.
3. Provide crisp, actionable advice with bullet points where appropriate.
4. Keep responses encouraging, empowering, and easy to understand.
5. If the context does not contain enough information to answer definitively, clarify what is available and offer constructive guidance.`;

    const contextString = `USER FINANCIAL CONTEXT (CALCULATED GROUND TRUTH):
- Currency: ${contextData.currency || '₹'}
- Current Month Income: ${contextData.currency || '₹'}${contextData.monthlyIncome?.toLocaleString() || 0}
- Current Month Total Spent: ${contextData.currency || '₹'}${contextData.totalExpenses?.toLocaleString() || 0}
- Net Savings This Month: ${contextData.currency || '₹'}${contextData.netSavings?.toLocaleString() || 0} (Savings Rate: ${contextData.savingsRate || 0}%)
- Safe to Spend Today: ${contextData.currency || '₹'}${contextData.safeToSpendDaily?.toLocaleString() || 0}/day
- Financial Health Score: ${contextData.healthScore || 0}/100 (${contextData.healthGrade || 'Good'})
- Top Spending Categories: ${JSON.stringify(contextData.topCategories || [])}
- Active Budgets Status: ${JSON.stringify(contextData.budgets || [])}
- Active Savings Goals: ${JSON.stringify(contextData.goals || [])}
- Monthly Subscriptions Load: ${contextData.currency || '₹'}${contextData.subscriptionMonthly?.toLocaleString() || 0}
- Spending Run Rate & Forecast: Month-end expected spend ${contextData.currency || '₹'}${contextData.forecastMonthEnd?.toLocaleString() || 0}
- Detected Anomalies: ${contextData.anomaliesCount || 0} unusual transactions flagged`;

    const prompt = `${contextString}

USER QUESTION: "${question}"

Provide a direct, helpful, and data-backed response based strictly on their numbers above.`;

    const aiAnswer = await this.callGemini(prompt, systemInstruction);
    if (aiAnswer) {
      return {
        answer: aiAnswer,
        suggestedActions: [
          { label: 'View Safe-to-Spend breakdown', action: 'navigate_dashboard' },
          { label: 'Review Budget Limits', action: 'navigate_budgets' },
          { label: 'Simulate in What-If', action: 'navigate_whatif' },
        ],
      };
    }

    // High Quality Intelligent Fallback if API key not present
    let fallbackText = `Here is your current financial summary based on your actual data:
• Total Spent this month: ${contextData.currency || '₹'}${contextData.totalExpenses?.toLocaleString() || 0}
• Safe to spend today: ${contextData.currency || '₹'}${contextData.safeToSpendDaily?.toLocaleString() || 0}/day
• Savings rate: ${contextData.savingsRate || 0}%
• Health score: ${contextData.healthScore || 0}/100 (${contextData.healthGrade || 'Healthy'})

Top expense category: ${contextData.topCategories?.[0]?.category || 'General'} (${contextData.currency || '₹'}${contextData.topCategories?.[0]?.amount?.toLocaleString() || 0}).`;

    return {
      answer: fallbackText,
      suggestedActions: [
        { label: 'Explore Analytics', action: 'navigate_analytics' },
        { label: 'Check Budget Status', action: 'navigate_budgets' },
      ],
    };
  }

  /**
   * AI Budget Generator Recommendation (50/30/20 + Historical adjustment)
   */
  static async generateBudgetRecommendation(income, historicalSpending = [], goal = 'Save more', currency = '₹') {
    const needsPercentage = goal === 'Save more' ? 0.45 : 0.5;
    const wantsPercentage = goal === 'Save more' ? 0.25 : 0.3;
    const savingsPercentage = goal === 'Save more' ? 0.3 : 0.2;

    const baseNeeds = Math.round(income * needsPercentage);
    const baseWants = Math.round(income * wantsPercentage);
    const baseSavings = Math.round(income * savingsPercentage);

    const recommendedCategories = [
      { category: 'Rent', limit: Math.round(baseNeeds * 0.5), type: 'Needs' },
      { category: 'Food', limit: Math.round(baseNeeds * 0.3), type: 'Needs' },
      { category: 'Bills', limit: Math.round(baseNeeds * 0.12), type: 'Needs' },
      { category: 'Transport', limit: Math.round(baseNeeds * 0.08), type: 'Needs' },
      { category: 'Shopping', limit: Math.round(baseWants * 0.45), type: 'Wants' },
      { category: 'Entertainment', limit: Math.round(baseWants * 0.3), type: 'Wants' },
      { category: 'Subscriptions', limit: Math.round(baseWants * 0.15), type: 'Wants' },
      { category: 'Personal', limit: Math.round(baseWants * 0.1), type: 'Wants' },
      { category: 'Investments', limit: baseSavings, type: 'Savings' },
    ];

    const rationale = `Based on your monthly income of ${currency}${income.toLocaleString()} and your goal to "${goal}", we recommend allocating ${Math.round(needsPercentage * 100)}% (${currency}${baseNeeds.toLocaleString()}) to essential needs, ${Math.round(wantsPercentage * 100)}% (${currency}${baseWants.toLocaleString()}) to lifestyle & discretionary expenses, and ${Math.round(savingsPercentage * 100)}% (${currency}${baseSavings.toLocaleString()}) to automated savings and investments.`;

    return {
      monthlyIncome: income,
      needsTotal: baseNeeds,
      wantsTotal: baseWants,
      savingsTotal: baseSavings,
      recommendedCategories,
      rationale,
      isEstimate: true,
    };
  }

  /**
   * Explain What-If Financial Simulation
   */
  static async explainWhatIfScenario(simulationData, currency = '₹') {
    const { scenarioType, changeAmount, currentSavings, projectedSavings, difference } = simulationData;
    const isPositive = difference >= 0;

    let explanation = `Simulating this change indicates a monthly ${isPositive ? 'gain' : 'reduction'} of ${currency}${Math.abs(difference).toLocaleString()} in net savings. `;

    if (scenarioType === 'reduce_expense') {
      explanation += `Cutting this expense will boost your projected annual savings by ${currency}${(changeAmount * 12).toLocaleString()}, accelerating your savings goals significantly.`;
    } else if (scenarioType === 'one_time_purchase') {
      explanation += `Making this one-time purchase of ${currency}${changeAmount.toLocaleString()} will adjust your safe daily spend rate. You can offset this by pacing discretionary spending over the next 2-3 weeks.`;
    } else if (scenarioType === 'income_increase') {
      explanation += `An additional income of ${currency}${changeAmount.toLocaleString()}/month increases your annual wealth generation by ${currency}${(changeAmount * 12).toLocaleString()}. Recommended: Allocate 60% of this raise directly to investments.`;
    }

    return {
      explanation,
      annualImpact: difference * 12,
    };
  }

  /**
   * Generate Monthly AI Financial Narrative Report
   */
  static async generateMonthlyReportNarrative(reportData, currency = '₹') {
    const prompt = `Generate a structured, professional monthly financial executive summary for the user:
Data:
- Month: ${reportData.month}/${reportData.year}
- Total Income: ${currency}${reportData.summaryData?.totalIncome?.toLocaleString()}
- Total Expenses: ${currency}${reportData.summaryData?.totalExpenses?.toLocaleString()}
- Net Savings: ${currency}${reportData.summaryData?.netSavings?.toLocaleString()} (${reportData.summaryData?.savingsRate}%)
- Health Score: ${reportData.summaryData?.healthScore}/100
- Top Categories: ${JSON.stringify(reportData.summaryData?.topCategories || [])}
- Budget Overruns: ${JSON.stringify(reportData.summaryData?.budgetStatus?.filter((b) => b.percentage > 100) || [])}
- Subscriptions Total: ${currency}${reportData.summaryData?.subscriptionTotal?.toLocaleString()}

Format as 3 clear paragraphs:
1. Executive Snapshot & Savings Performance
2. Spending Hotspots & Budget Highlights
3. Top 3 AI Actionable Recommendations for Next Month.`;

    const narrative = await this.callGemini(prompt);
    if (narrative) {
      return narrative;
    }

    return `### Monthly Performance Snapshot (${reportData.month}/${reportData.year})
You recorded a total income of ${currency}${reportData.summaryData?.totalIncome?.toLocaleString()} with total expenses of ${currency}${reportData.summaryData?.totalExpenses?.toLocaleString()}, resulting in net savings of ${currency}${reportData.summaryData?.netSavings?.toLocaleString()} (${reportData.summaryData?.savingsRate}% savings rate). Your financial health score stands at a resilient ${reportData.summaryData?.healthScore}/100.

### Spending Highlights
Your primary spending driver this month was **${reportData.summaryData?.topCategories?.[0]?.category || 'General'}** totaling ${currency}${reportData.summaryData?.topCategories?.[0]?.amount?.toLocaleString()}. Active recurring subscriptions accounted for ${currency}${reportData.summaryData?.subscriptionTotal?.toLocaleString()} of monthly cash flow.

### Key Recommendations
1. **Maintain your current savings pace** to reach scheduled goal milestones ahead of time.
2. **Review discretionary spending** in your top category to unlock additional monthly surplus.
3. **Audit active subscriptions** to ensure every recurring service delivers active value.`;
  }
}

export default AIService;
