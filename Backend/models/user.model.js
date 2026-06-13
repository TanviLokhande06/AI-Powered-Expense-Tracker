import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },

        passwordHash: {
            type: String,
            required: true,
        },

        currency: {
            type: String,
            default: "USD",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("User", userSchema);