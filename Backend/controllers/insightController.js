import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import Budget from "../models/budget.model.js";
import AIInsight from "../models/aiInsight.js";
import {
    generateMonthlyInsight,
    generateBudgetAlert,
    generateSavingsTips,
} from "../utils/gemini.js";

const getUserCurrency = async (userId) => {
    const user = await User.findById(userId);

    return user?.currency || "USD";
};

export const getInsights = async (
    req,
    res
) => {
    try {
        const insights =
            await AIInsight.find({
                userId: req.userId,
            })
                .sort({
                    createdAt: -1,
                })
                .limit(50);

        res.json(insights);
    } catch (error) {
        console.error(
            "GetInsights error:",
            error
        );

        res.status(500).json({
            message: "Server error",
        });
    }
};

const buildMonthlyInsight =
    async (userId) => {
        const now = new Date();

        const monthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const threeMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            1
        );

        const currentMonth =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        transactionDate: {
                            $gte: monthStart,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$type",

                        total: {
                            $sum: "$amount",
                        },
                    },
                },
            ]);

        let totalIncome = 0;
        let totalExpenses = 0;

        currentMonth.forEach((row) => {
            if (row._id === "income") {
                totalIncome = row.total;
            }

            if (row._id === "expense") {
                totalExpenses = row.total;
            }
        });

        const expenseBreakdown =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        type: "expense",
                        transactionDate: {
                            $gte: monthStart,
                        },
                    },
                },

                {
                    $group: {
                        _id: "$categoryId",

                        total: {
                            $sum: "$amount",
                        },
                    },
                },

                {
                    $lookup: {
                        from: "categories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "category",
                    },
                },

                {
                    $unwind: "$category",
                },

                {
                    $project: {
                        category_name:
                            "$category.name",

                        total: 1,
                    },
                },

                {
                    $sort: {
                        total: -1,
                    },
                },
            ]);

        const previousMonths =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        transactionDate: {
                            $gte: threeMonthsAgo,
                            $lt: monthStart,
                        },
                    },
                },

                {
                    $group: {
                        _id: {
                            month: {
                                $dateToString: {
                                    format: "%Y-%m",
                                    date: "$transactionDate",
                                },
                            },
                        },

                        income: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$type",
                                            "income",
                                        ],
                                    },
                                    "$amount",
                                    0,
                                ],
                            },
                        },

                        expense: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$type",
                                            "expense",
                                        ],
                                    },
                                    "$amount",
                                    0,
                                ],
                            },
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,
                        month: "$_id.month",
                        income: 1,
                        expense: 1,
                    },
                },

                {
                    $sort: {
                        month: 1,
                    },
                },
            ]);

        const savingsRate =
            totalIncome > 0
                ? (
                    ((totalIncome -
                        totalExpenses) /
                        totalIncome) *
                    100
                )
                : 0;

        const currency =
            await getUserCurrency(userId);

        const content =
            await generateMonthlyInsight({
                totalIncome,
                totalExpenses,
                savingsRate,
                expenseBreakdown,
                previousMonths,
                currency,
            });

        const periodStart = monthStart;

        const periodEnd = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        );

        return {
            content,
            periodStart,
            periodEnd,
        };
    };

const buildSavingsTips =
    async (userId) => {
        const thirtyDaysAgo =
            new Date();

        thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() -
            30
        );

        const topCategories =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        type: "expense",
                        transactionDate: {
                            $gte:
                                thirtyDaysAgo,
                        },
                    },
                },

                {
                    $group: {
                        _id: "$categoryId",

                        total: {
                            $sum: "$amount",
                        },

                        transaction_count:
                        {
                            $sum: 1,
                        },
                    },
                },

                {
                    $lookup: {
                        from: "categories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "category",
                    },
                },

                {
                    $unwind: "$category",
                },

                {
                    $project: {
                        categoryId: {
                            name: "$category.name",
                        },

                        total: 1,
                        transaction_count: 1,
                    },
                },

                {
                    $sort: {
                        total: -1,
                    },
                },

                {
                    $limit: 5,
                },
            ]);

        const income =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        type: "income",
                        transactionDate: {
                            $gte:
                                thirtyDaysAgo,
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

        const monthlyIncome =
            income[0]?.total || 0;

        const currency =
            await getUserCurrency(userId);

        const content =
            await generateSavingsTips({
                topCategories,
                monthlyIncome,
                currency,
            });

        return {
            content,
            periodStart: null,
            periodEnd: null,
        };
    };

const buildBudgetAlert =
    async (
        userId,
        categoryId
    ) => {
        if (!categoryId) {
            const err = new Error(
                "categoryId is required"
            );

            err.status = 400;

            throw err;
        }

        const budget =
            await Budget.findOne({
                userId,
                categoryId,
            }).populate(
                "categoryId",
                "name"
            );

        if (!budget) {
            const err = new Error(
                "Budget not found"
            );

            err.status = 404;

            throw err;
        }

        const monthStart =
            new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
            );

        const spent =
            await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        categoryId:
                            budget.categoryId
                                ._id,
                        type: "expense",
                        transactionDate: {
                            $gte:
                                monthStart,
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

        const spentAmount =
            spent[0]?.total || 0;

        const now = new Date();

        const currency =
            await getUserCurrency(userId);

        const content =
            await generateBudgetAlert({
                categoryName:
                    budget.categoryId
                        .name,

                budgetAmount:
                    budget.amount,

                spentAmount,

                daysIntoPeriod:
                    now.getDate(),

                totalPeriodDays:
                    new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        0
                    ).getDate(),

                currency,
            });

        return {
            content,
            periodStart: null,
            periodEnd: null,
        };
    };

export const generateInsight =
    async (req, res) => {
        const {
            type,
            categoryId,
        } = req.body;

        if (!type) {
            return res.status(400).json({
                message:
                    "Insight type is required",
            });
        }

        try {
            let result;

            if (
                type ===
                "monthly_summary"
            ) {
                result =
                    await buildMonthlyInsight(
                        req.userId
                    );
            } else if (
                type ===
                "savings_tips"
            ) {
                result =
                    await buildSavingsTips(
                        req.userId
                    );
            } else if (
                type ===
                "budget_alert"
            ) {
                result =
                    await buildBudgetAlert(
                        req.userId,
                        categoryId
                    );
            } else {
                return res.status(400).json({
                    message:
                        "Unknown insight type",
                });
            }

            const insight =
                await AIInsight.create({
                    userId:
                        req.userId,

                    insightType: type,

                    periodStart:
                        result.periodStart,

                    periodEnd:
                        result.periodEnd,

                    content:
                        result.content,
                });

            res.status(201).json(
                insight
            );
        } catch (error) {
            console.error(
                "GenerateInsight error:",
                error
            );

            res
                .status(
                    error.status || 500
                )
                .json({
                    message:
                        error.message ||
                        "Server error",
                });
        }
    };