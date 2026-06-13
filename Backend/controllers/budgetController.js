import budgetModel from "../models/budget.model.js";
import transactionModel from "../models/transaction.model.js";
import userModel from "../models/user.model.js";
import categoryModel from "../models/category.model.js";
import mongoose from "mongoose";
import { analyzeBudgetList } from "../utils/gemini.js";


export const getBudgets = async (req, res) => {
    try {
        const budgets = await budgetModel.find({
            userId: req.userId,
        }).populate(
            "categoryId",
            "name icon color"
        );

        const result = await Promise.all(
            budgets.map(async (budget) => {
                const startDate = new Date();

                if (budget.period === "monthly") {
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                } else {
                    const day = startDate.getDay();
                    startDate.setDate(
                        startDate.getDate() - day
                    );
                    startDate.setHours(0, 0, 0, 0);
                }

                const spentResult = await transactionModel.aggregate([
                    {
                        $match: {
                            userId: budget.userId,
                            categoryId: budget.categoryId._id,
                            type: "expense",
                            transactionDate: {
                                $gte: startDate,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: "$amount",
                            },
                        },
                    },
                ]);

                const spent = spentResult.length > 0 ? spentResult[0].total : 0;

                return {
                    id: budget._id,

                    categoryId: budget.categoryId?._id || null,

                    amount: budget.amount,

                    period: budget.period,

                    startDate: budget.startDate,

                    category_name:
                        budget.categoryId?.name || "Uncategorized",

                    category_icon:
                        budget.categoryId?.icon || "Folder",

                    category_color:
                        budget.categoryId?.color || "#94A3B8",

                    spent,
                };
            })
        );

        res.json(result);
    } catch (error) {
        console.error("GetBudgets error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const createBudget = async (req, res) => {
    const { categoryId, amount, period = "monthly", startDate } = req.body;

    if (!categoryId || !amount) {
        return res.status(400).json({
            message: "categoryId and amount are required",
        });
    }

    if (!["monthly", "weekly"].includes(period)) {
        return res.status(400).json({
            message: "Period must be monthly or weekly",
        });
    }

    try {
        // Accept either an ObjectId or a category name
        let resolvedCategoryId = categoryId;

        if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
            // try to find category by name for this user
            const cat = await categoryModel.findOne({ userId: req.userId, name: String(categoryId) });

            if (!cat) {
                return res.status(400).json({ message: "Category not found" });
            }

            resolvedCategoryId = cat._id;
        }

        const existingBudget = await budgetModel.findOne({
            userId: req.userId,
            categoryId: resolvedCategoryId,
            period,
        });

        if (existingBudget) {
            return res.status(400).json({
                message: "Budget already exists for this category and period",
            });
        }

        const today = new Date();

        const effectiveStart = startDate || new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        const budget = await budgetModel.create({
            userId: req.userId,
            categoryId: resolvedCategoryId,
            amount,
            period,
            startDate: effectiveStart,
        });

        res.status(201).json(budget);
    } catch (error) {
        console.error("CreateBudget error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const updateBudget = async (req, res) => {
    const { id } = req.params;

    const { amount, period } = req.body;

    try {
        const budget = await budgetModel.findOneAndUpdate(
            {
                _id: id,
                userId: req.userId,
            },
            {
                ...(amount !== undefined && {
                    amount,
                }),

                ...(period !== undefined && {
                    period,
                }),
            },
            {
                new: true,
            }
        );

        if (!budget) {
            return res.status(404).json({
                message: "Budget not found",
            });
        }

        res.json(budget);
    } catch (error) {
        console.error("UpdateBudget error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const deleteBudget = async (req, res) => {
    const { id } = req.params;

    try {
        const budget = await budgetModel.findOneAndDelete({
            _id: id,
            userId: req.userId,
        });

        if (!budget) {
            return res.status(404).json({
                message: "Budget not found",
            });
        }

        res.json({
            message: "Budget deleted",
        });
    } catch (error) {
        console.error("DeleteBudget error:", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const analyzeBudgets = async (req, res) => {
    try {
        const budgets = await budgetModel.find({ userId: req.userId, }).populate("categoryId", "name");

        if (budgets.length === 0) {
            return res.json({
                analyses: [],
            });
        }

        const budgetData = await Promise.all(
            budgets.map(async (budget) => {
                let startDate;

                if (budget.period === "monthly") {
                    startDate = new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1
                    );
                } else {

                    const now = new Date();

                    startDate = new Date(now);

                    startDate.setDate(now.getDate() - now.getDay());

                    startDate.setHours(0, 0, 0, 0);
                }

                const spentResult = await transactionModel.aggregate([
                    {
                        $match: {
                            userId: req.userId,
                            categoryId: budget.categoryId._id,
                            type: "expense",
                            transactionDate: {
                                $gte: startDate,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            spent: {
                                $sum: "$amount",
                            },
                        },
                    },
                ]);

                return {
                    id: budget._id.toString(),
                    amount: budget.amount,
                    period: budget.period,
                    category_name: budget.categoryId.name,
                    spent: spentResult[0]?.spent || 0,
                };
            })
        );

        const user = await userModel.findById(req.userId);

        const currency = user?.currency || "USD";

        // If GEMINI API key not configured, provide a simple rule-based fallback analysis
        if (!process.env.GEMINI_API_KEY) {
            const analyses = budgetData.map((b) => {
                const spent = Number(b.spent || 0);
                const total = Number(b.amount || 0) || 0;
                const pct = total > 0 ? (spent / total) * 100 : 0;
                let status = "good";
                if (pct >= 100) status = "concerning";
                else if (pct >= 70) status = "caution";

                const message =
                    status === "concerning"
                        ? `You're over budget (${Math.round(pct)}%). Consider reducing spend or increasing your budget.`
                        : status === "caution"
                            ? `You're approaching your budget (${Math.round(pct)}% used). Monitor upcoming expenses.`
                            : `You're within budget (${Math.round(pct)}% used). Good work.`;

                return {
                    budgetId: String(b.id || b._id || b.id),
                    status,
                    message,
                };
            });

            return res.json({ analyses });
        }

        try {
            const data = await analyzeBudgetList({
                budgets: budgetData,
                currency,
            });

            return res.json(data);
        } catch (aiError) {
            console.error("AnalyzeBudgets AI error:", aiError);

            // Fallback rule-based analyses when AI fails (quota, API error, etc.)
            const analyses = budgetData.map((b) => {
                const spent = Number(b.spent || 0);
                const total = Number(b.amount || 0) || 0;
                const pct = total > 0 ? (spent / total) * 100 : 0;
                let status = "good";
                if (pct >= 100) status = "concerning";
                else if (pct >= 70) status = "caution";

                const message =
                    status === "concerning"
                        ? `You're over budget (${Math.round(pct)}%). Consider reducing spend or increasing your budget.`
                        : status === "caution"
                            ? `You're approaching your budget (${Math.round(pct)}% used). Monitor upcoming expenses.`
                            : `You're within budget (${Math.round(pct)}% used). Good work.`;

                return {
                    budgetId: String(b.id || b._id || b.id),
                    status,
                    message,
                };
            });

            return res.json({ analyses });
        }
    } catch (error) {
        console.error("AnalyzeBudgets error:", error);

        res.status(500).json({
            message: error.message || "Server error",
        });
    };
};