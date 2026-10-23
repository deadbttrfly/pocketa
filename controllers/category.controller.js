const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../services/category.service");

const { validateRequiredString } = require("../utils/validation");

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

async function getCategories(req, res) {
  try {
    const userId = req.user.id;

    const { type } = req.query;

    if (type && !["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category type",
      });
    }

    const categories = await getAllCategories(userId, type || null);

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getCategory(req, res) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    if (!isValidId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await getCategoryById(userId, categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;

    const { name, type } = req.body;

    const nameError = validateRequiredString(name, "Name", 100);

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (typeof type !== "string" || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const normalizedName = name.trim();
    const normalizedType = type.trim().toLowerCase();

    const allowedTypes = ["income", "expense"];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category type",
      });
    }

    const category = await createCategory(
      userId,
      normalizedName,
      normalizedType,
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Category with the same name and type already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function update(req, res) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    if (!isValidId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const { name, type } = req.body;

    const nameError = validateRequiredString(name, "Name", 100);

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (typeof type !== "string" || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const normalizedName = name.trim();
    const normalizedType = type.trim().toLowerCase();

    const allowedTypes = ["income", "expense"];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category type",
      });
    }

    const category = await updateCategory(
      userId,
      categoryId,
      normalizedName,
      normalizedType,
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Category with the same name and type already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function remove(req, res) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    if (!isValidId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const deleted = await deleteCategory(userId, categoryId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "Category cannot be deleted because it is already used by a transaction",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getCategories,
  getCategory,
  create,
  update,
  remove,
};
