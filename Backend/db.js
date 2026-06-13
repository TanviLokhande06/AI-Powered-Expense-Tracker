import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Connected to DB");
    } catch (error) {
        console.log("MongoDB Connection Error: ", error.message);
        process.exit(1);
    }
};

export default connectDB;