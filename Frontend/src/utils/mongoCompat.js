export const getId = (obj) => {
    if (!obj) return undefined;
    if (typeof obj.id === "string" || typeof obj.id === "number") return obj.id;
    if (obj._id) return typeof obj._id === "string" ? obj._id : String(obj._id);
    return undefined;
};

export const getTransactionDate = (obj) => {
    if (!obj) return undefined;
    if (obj.transactionDate) return obj.transactionDate;
    if (obj.transaction_date) return obj.transaction_date;
    return undefined;
};

export const getCategory = (obj) => {
    if (!obj) return { id: null, name: null, icon: null, color: null };
    if (obj.categoryId) {
        return {
            id: getId(obj.categoryId),
            name: obj.categoryId.name || obj.category_name || null,
            icon: obj.categoryId.icon || obj.category_icon || null,
            color: obj.categoryId.color || obj.category_color || null,
        };
    }

    return {
        id: obj.categoryId || obj.category_id || null,
        name: obj.category_name || null,
        icon: obj.category_icon || null,
        color: obj.category_color || null,
    };
};

export const isDefaultCategory = (c) => {
    if (!c) return false;
    return c.isDefault === true || c.is_default === true;
};
