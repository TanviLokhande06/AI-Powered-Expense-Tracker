import categoryModel from "../models/category.model.js";
import transactionModel from "../models/transaction.model.js";


export const getCategories = async (req, res) => {
    try {
        const categories = await categoryModel
            .find({ userId: req.userId })
            .sort({
                type: 1,
                name: 1,
            });

        const result = categories.map((c) => ({
            id: c._id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
            is_default: c.isDefault,
        }));

        res.json(result);
    } catch (error) {
        console.error("GetCategories error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};


export const createCategory = async (req, res) => {
    const { name, type, icon, color } = req.body;

    try {
        const category = await categoryModel.create({
            userId: req.userId,
            name,
            type,
            icon,
            color,
            isDefault: false,
        });

        res.status(201).json({
            id: category._id,
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            is_default: category.isDefault,
        });
    } catch (error) {
        console.error("CreateCategory error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};


export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, icon, color } = req.body;

    try {
        const category = await categoryModel.findOneAndUpdate(
            {
                _id: id,
                userId: req.userId,
            },
            {
                ...(name && { name }),
                ...(icon && { icon }),
                ...(color && { color }),
            },
            {
                new: true,
            }
        );

        if (!category) {
            return res.status(404).json({
                message: "Category not found",
            });
        }

        res.json({
            id: category._id,
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            is_default: category.isDefault,
        });
    } catch (error) {
        console.error("UpdateCategory error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};


export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await categoryModel.findOne({
            _id: id,
            userId: req.userId,
        });

        if (!category) {
            return res.status(404).json({
                message: "Category not found",
            });
        }

        await transactionModel.updateMany(
            {
                userId: req.userId,
                categoryId: id,
            },
            {
                $set: {
                    categoryId: null,
                },
            }
        );

        await category.deleteOne();

        res.json({
            message: "Category deleted",
        });
    } catch (error) {
        console.error("DeleteCategory error:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};