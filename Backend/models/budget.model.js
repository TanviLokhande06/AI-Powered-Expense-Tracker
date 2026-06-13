import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        period: {
            type: String,
            enum: ["monthly", "weekly"],
            default: "monthly",
        },

        startDate: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

budgetSchema.index(
    {
        userId: 1,
        categoryId: 1,
        period: 1,
    },
    {
        unique: true,
    }
);

export default mongoose.model("Budget", budgetSchema);