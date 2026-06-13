import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, });

if (!process.env.GEMINI_API_KEY) {
  console.error("⚠️ WARNING: GEMINI_API_KEY is not set. AI features will not work.");
}

const stripMarkdown = (text) => {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");

  return cleaned.trim();
};


export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpenses,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "USD",
}) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
        .map(
          (c) =>
            `- ${c.category_name}: ${currency} ${Number(
              c.total
            ).toFixed(2)}`
        )
        .join("\n")
      : "- No expenses recorded yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
        .map(
          (m) =>
            `- ${m.month}: Income ${currency} ${Number(
              m.income
            ).toFixed(2)}, Expenses ${currency} ${Number(
              m.expense
            ).toFixed(2)}`
        )
        .join("\n")
      : "- No previous month data available";

  const prompt = `
Analyze this user's monthly financial data and generate actionable insights.

Currency: ${currency}
Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
Total Expenses (this month): ${currency} ${totalExpenses.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%

Expense breakdown by category:
${breakdownText}

Previous months trend:
${trendText}

Return ONLY valid JSON:

{
  "summary": "2-3 sentence summary",
  "highlights": ["Positive observation 1", "Positive observation 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "recommendations": [
    {
      "title": "Short title",
      "detail": "Actionable recommendation"
    }
  ],
  "topSpendingCategory": "Category name or null",
  "estimatedMonthlySavings": number,
  "healthScore": number
}

Rules:
- healthScore between 0 and 100
- exactly 3 recommendations
- use actual numbers from the data
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return JSON.parse(stripMarkdown(response.text));
  } catch (error) {
    console.error("Gemini API error (monthly insight): ", error);

    throw new Error("Failed to generate monthly insight.");
  };
};


export const generateBudgetAlert = async ({
  categoryName,
  budgetAmount,
  spentAmount,
  daysIntoPeriod,
  totalPeriodDays,
  currency = "USD",
}) => {
  const percentUsed = ((spentAmount / budgetAmount) * 100).toFixed(1);

  const daysLeft = totalPeriodDays - daysIntoPeriod;

  const prompt = `
A user is tracking a budget.

Category: ${categoryName}
Budget: ${currency} ${budgetAmount.toFixed(2)}
Spent: ${currency} ${spentAmount.toFixed(2)}
Usage: ${percentUsed}%
Days elapsed: ${daysIntoPeriod}/${totalPeriodDays}
Days remaining: ${daysLeft}

Return ONLY valid JSON:

{
  "severity": "info|warning|critical",
  "title": "Short title",
  "message": "Friendly message",
  "suggestions": [
    "Action 1",
    "Action 2",
    "Action 3"
  ]
}

Severity:
- info = under 70%
- warning = 70%-100%
- critical = over 100%
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return JSON.parse(
      stripMarkdown(response.text)
    );
  } catch (error) {
    console.error("Gemini API error (budget alert): ", error);

    throw new Error("Failed to generate budget alert.");
  };
};


export const generateSavingsTips = async ({
  topCategories,
  monthlyIncome,
  currency = "USD",
}) => {
  const categoryText =
    topCategories.length > 0
      ? topCategories
        .map(
          (c) =>
            `- ${c.categoryId?.name ||
            c.category_name ||
            "Unknown"
            }: ${currency} ${Number(
              c.total
            ).toFixed(2)} across ${c.transaction_count
            } transactions`
        )
        .join("\n")
      : "- No spending data available";

  const prompt = `
Generate personalized savings tips.

Monthly Income: ${currency} ${monthlyIncome.toFixed(
    2
  )}

Top spending categories:
${categoryText}

Return ONLY valid JSON:

{
  "overallTip": "One sentence",
  "tips": [
    {
      "category": "Category",
      "title": "Short title",
      "detail": "Actionable advice",
      "estimatedSavings": number
    }
  ]
}

Rules:
- Exactly 4 tips
- Use actual categories
- Include realistic savings estimates
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return JSON.parse(
      stripMarkdown(response.text)
    );
  } catch (error) {
    console.error("Gemini API error (savings tips): ", error);

    throw new Error("Failed to generate savings tips.");
  };
};


export const analyzeTransactionList = async ({
  transactions,
  currency = "USD",
}) => {
  const formatDate = (date) => {
    if (!date) return "";

    const d = new Date(date);

    return d.toISOString().split("T")[0];
  };

  const lines = transactions.slice(0, 50).map((t) => {
    const date = formatDate(t.transactionDate);

    const amount = Number(t.amount).toFixed(2);

    const category = t.categoryId?.name || "uncategorized";

    const description = t.description?.trim() ? ` | ${t.description}` : "";

    return `- ${date}: ${t.type} ${currency} ${amount} | ${category}${description}`;
  }).join("\n");

  const prompt = `
Analyze these ${transactions.length} transactions.

Transactions:
${lines}

Return ONLY valid JSON:

{
  "insight": "2-4 sentence analysis",
  "highlight": "Short key takeaway"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return JSON.parse(
      stripMarkdown(response.text)
    );
  } catch (error) {
    console.error("Gemini API error (transaction analysis): ", error);

    throw new Error("Failed to analyze transactions.");
  };
};


export const analyzeBudgetList = async ({
  budgets,
  currency = "USD",
}) => {
  const lines = budgets.map((b) => {
    const spent = Number(b.spent || 0);

    const total = Number(b.amount || 0);

    const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : "0";

    return `
Budget ID: ${b._id}
Category: ${b.categoryId?.name ||
      "Unknown"
      }
Limit: ${currency} ${total.toFixed(2)}
Spent: ${currency} ${spent.toFixed(2)}
Usage: ${pct}%
`;
  }).join("\n");

  const prompt = `
You're a personal finance assistant.

Today:
${new Date()
      .toISOString()
      .split("T")[0]}

Budgets:
${lines}

Return ONLY valid JSON:

{
  "analyses": [
    {
      "budgetId": "id",
      "status": "good|caution|concerning",
      "message": "One sentence assessment"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return JSON.parse(
      stripMarkdown(response.text)
    );
  } catch (error) {
    console.error("Gemini API error (budget analysis):", error);

    throw new Error("Failed to analyze budgets.");
  };
};

export default {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList,
};