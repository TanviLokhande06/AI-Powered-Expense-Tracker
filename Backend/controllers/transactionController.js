import transactionModel from "../models/transaction.model.js";
import userModel from "../models/user.model.js";
import { analyzeTransactionList } from "../utils/gemini.js";


export const getTransactions = async (req, res) => {
    const { startDate, endDate, categoryId, type, search, limit = 50, offset = 0, } = req.query;

    try {
        const filter = { userId: req.userId };

        if (startDate || endDate) {
            filter.transactionDate = {};

            if (startDate) {
                filter.transactionDate.$gte = new Date(startDate);
            }

            if (endDate) {
                filter.transactionDate.$lte = new Date(endDate);
            }
        }

        if (categoryId) {
            filter.categoryId = categoryId;
        }

        if (type) {
            filter.type = type;
        }

        if (search) {
            filter.$or = [
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    notes: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const transactions = await transactionModel.find(filter).populate("categoryId", "name icon color").sort({ transactionDate: -1, createdAt: -1, }).skip(Number(offset)).limit(Number(limit));

        res.json(transactions);
    } catch (error) {
        console.error("GetTransactions error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const createTransaction = async (req, res) => {
    const { categoryId, amount, type, description, notes, transactionDate } = req.body;

    if (!amount || !type || !transactionDate) {
        return res.status(400).json({
            message: "Amount, type, and transactionDate are required",
        });
    }

    if (!["income", "expense"].includes(type)) {
        return res.status(400).json({
            message: "Type must be income or expense",
        });
    }

    try {
        const transaction = await transactionModel.create({
            userId: req.userId,
            categoryId: categoryId || null,
            amount,
            type,
            description,
            notes,
            transactionDate
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error("CreateTransaction error: ", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const getTransactionById = async (req, res) => {
    const { id } = req.params;

    try {
        const transaction = await transactionModel.findOne({
            _id: id,
            userId: req.userId,
        }).populate("categoryId", "name icon color");

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found",
            });
        }

        res.json(transaction);
    } catch (error) {
        console.error(
            "GetTransactionById error:",
            error
        );

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const updateTransaction = async (req, res) => {
    const { id } = req.params;

    const { categoryId, amount, type, description, notes, transactionDate } = req.body;

    try {
        const transaction = await transactionModel.findOneAndUpdate(
            {
                _id: id,
                userId: req.userId,
            },
            {
                ...(categoryId !== undefined && {
                    categoryId,
                }),

                ...(amount !== undefined && {
                    amount,
                }),

                ...(type !== undefined && {
                    type,
                }),

                ...(description !== undefined && {
                    description,
                }),

                ...(notes !== undefined && {
                    notes,
                }),

                ...(transactionDate !== undefined && {
                    transactionDate,
                }),
            },
            {
                new: true,
            }
        );

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found",
            });
        }

        res.json(transaction);
    } catch (error) {
        console.error(
            "UpdateTransaction error:",
            error
        );

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const deleteTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        const transaction = await transactionModel.findOneAndDelete({
            _id: id,
            userId: req.userId,
        });

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found",
            });
        }

        res.json({
            message: "Transaction deleted",
        });
    } catch (error) {
        console.error(
            "DeleteTransaction error:",
            error
        );

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const analyzeTransactions = async (req, res) => {
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({
            message: "transactionIds array is required",
        });
    }

    try {
        const ids = transactionIds.slice(0, 50);

        const transactions = await transactionModel.find({
            _id: { $in: ids },
            userId: req.userId,
        })
            .populate("categoryId", "name")
            .sort({ transactionDate: -1 });

        if (transactions.length === 0) {
            return res.status(404).json({
                message: "No transactions found for analysis",
            });
        }

        const user = await userModel.findById(req.userId);

        const currency = user?.currency || "USD";

        const formattedTransactions = transactions.map((t) => ({
            id: t._id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            transactionDate: t.transactionDate,
            category_name: t.categoryId?.name || "Uncategorized",
        }));

        const analysis = await analyzeTransactionList({
            transactions: formattedTransactions,
            currency,
        });

        res.json(analysis);
    } catch (error) {
        console.error("AnalyzeTransactions error:", error);

        res.status(500).json({
            message: error.message || "Server error",
        });
    };
};