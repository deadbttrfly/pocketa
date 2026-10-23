import { apiFetch } from "./api";

export type CategoryType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

export interface CategoriesResponse {
  success: boolean;
  message?: string;
  data: Category[];
}

export interface CategoryResponse {
  success: boolean;
  message: string;
  data: Category;
}

export interface DeleteCategoryResponse {
  success: boolean;
  message: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
}

export interface UpdateCategoryPayload {
  name: string;
  type: CategoryType;
}

export async function getCategories(
  token: string,
): Promise<CategoriesResponse> {
  return apiFetch<CategoriesResponse>("/categories", {
    method: "GET",
    token,
  });
}

export async function createCategory(
  token: string,
  payload: CreateCategoryPayload,
): Promise<CategoryResponse> {
  return apiFetch<CategoryResponse>("/categories", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  token: string,
  categoryId: number,
  payload: UpdateCategoryPayload,
): Promise<CategoryResponse> {
  return apiFetch<CategoryResponse>(`/categories/${categoryId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(
  token: string,
  categoryId: number,
): Promise<DeleteCategoryResponse> {
  return apiFetch<DeleteCategoryResponse>(
    `/categories/${categoryId}`,
    {
      method: "DELETE",
      token,
    },
  );
}