import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },

        description: {
            type: String,
            default: "",
        },

        notes: {
            type: String,
            default: "",
        },

        transactionDate: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

transactionSchema.index({
    userId: 1,
    transactionDate: -1,
});

transactionSchema.index({
    categoryId: 1,
});

export default mongoose.model("Transaction", transactionSchema);