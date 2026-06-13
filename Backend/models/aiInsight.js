import mongoose from "mongoose";

const aiInsightSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        insightType: {
            type: String,
            required: true,
        },

        periodStart: {
            type: Date,
        },

        periodEnd: {
            type: Date,
        },

        content: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

aiInsightSchema.index({
    userId: 1,
    createdAt: -1,
});

export default mongoose.model("AIInsight", aiInsightSchema);