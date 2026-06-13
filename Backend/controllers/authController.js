import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import defaultCategories from "../utils/defaultCategories.js";
import userModel from "../models/user.model.js";
import categoryModel from "../models/category.model.js";


const signToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};


export const register = async (req, res) => {
    try {
        const { name, email, password, currency = "USD" } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required"
            });
        };

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        };

        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        };

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await userModel.create({
            name,
            email,
            passwordHash,
            currency
        });

        const categories = defaultCategories.map((cat) => ({
            userId: user._id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
        }));

        await categoryModel.insertMany(categories);

        const token = signToken(user._id);

        res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                currency: user.currency,
                createdAt: user.createdAt,
            },
            token,
        });

    } catch (error) {
        console.error("Register Error: ", error);

        res.status(500).json({
            message: "Server Error"
        });
    };
};


export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required",
        });
    };

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid Credentials",
            });
        };

        const match = await bcrypt.compare(password, user.passwordHash);

        if (!match) {
            return res.status(400).json({
                message: "Invalid Credentials",
            });
        };

        const token = signToken(user._id);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                currency: user.currency,
            },
            token,
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};


export const getMe = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).select("_id name email currency createdAt");

        if (!user) {
            return res.status(400).json({
                message: "User not found",
            });
        };

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            currency: user.currency,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error("GetMe error:", error);

        res.status(500).json({
            message: "Server error",
        });
    };
};