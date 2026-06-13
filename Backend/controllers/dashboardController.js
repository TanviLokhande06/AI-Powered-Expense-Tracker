import transactionModel from "../models/transaction.model.js";


const pctChange = (current, previous) => {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return ((current - previous) / previous) * 100;
};


export const getSummary = async (req, res) => {
    try {
        const now = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

        const currentMonthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const previousMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

        const summary = await transactionModel.aggregate([
            {
                $match: {
                    userId: req.userId,
                    transactionDate: { $gte: previousMonthStart, },
                },
            },
            {
                $group: {
                    _id: {
                        month: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$transactionDate",
                                timezone,
                            },
                        },
                        type: "$type",
                    },

                    total: {
                        $sum: "$amount",
                    },
                },
            },
        ]);

        const currentMonthKey = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}`;

        const previousMonthKey = `${previousMonthStart.getFullYear()}-${String(previousMonthStart.getMonth() + 1).padStart(2, '0')}`;

        let incomeThisMonth = 0;
        let expenseThisMonth = 0;
        let incomeLastMonth = 0;
        let expenseLastMonth = 0;

        summary.forEach((item) => {
            if (item._id.month === currentMonthKey) {
                if (item._id.type === "income") {
                    incomeThisMonth = item.total;
                } else {
                    expenseThisMonth = item.total;
                }
            }

            if (item._id.month === previousMonthKey) {
                if (item._id.type === "income") {
                    incomeLastMonth = item.total;
                } else {
                    expenseLastMonth = item.total;
                }
            }
        });

        const balance = incomeThisMonth - expenseThisMonth;

        const savingsRate = incomeThisMonth > 0 ? (balance / incomeThisMonth) * 100 : 0;

        res.json({
            incomeThisMonth,
            expenseThisMonth,
            balance,
            savingsRate,
            incomeDelta: pctChange(
                incomeThisMonth,
                incomeLastMonth
            ),
            expenseDelta: pctChange(
                expenseThisMonth,
                expenseLastMonth
            ),
        });

    } catch (error) {
        console.error("GetSummary error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const getCategoryBreakdown = async (req, res) => {
    try {
        const monthStart = new Date();

        monthStart.setDate(1);

        monthStart.setHours(0, 0, 0, 0);

        const breakdown = await transactionModel.aggregate([
            {
                $match: {
                    userId: req.userId,
                    type: "expense",
                    transactionDate: { $gte: monthStart, },
                },
            },

            {
                $group: {
                    _id: "$categoryId",
                    total: {
                        $sum: "$amount",
                    },
                    transaction_count: {
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
                    category_id: "$_id",
                    category_name: "$category.name",
                    category_icon: "$category.icon",
                    category_color: "$category.color",
                    total: 1,
                    transaction_count: 1,
                },
            },

            {
                $sort: {
                    total: -1,
                },
            },
        ]);

        res.json(breakdown);

    } catch (error) {
        console.error("GetCategoryBreakdown error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const getMonthlyTrend = async (req, res) => {
    try {
        const startDate = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

        startDate.setMonth(startDate.getMonth() - 5);

        startDate.setDate(1);

        const trend = await transactionModel.aggregate([
            {
                $match: {
                    userId: req.userId,
                    transactionDate: { $gte: startDate, },
                },
            },

            {
                $group: {
                    _id: {
                        month: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$transactionDate",
                                timezone,
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

        res.json(trend);
    } catch (error) {
        console.error("GetMonthlyTrend error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};