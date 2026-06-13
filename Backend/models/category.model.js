import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },

        icon: {
            type: String,
            default: "",
        },

        color: {
            type: String,
            default: "",
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

categorySchema.index(
    {
        userId: 1,
        name: 1,
        type: 1,
    },
    {
        unique: true,
    }
);

export default mongoose.model("Category", categorySchema);