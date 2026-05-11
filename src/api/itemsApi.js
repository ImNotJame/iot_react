import { apiClient } from "./client";

export const itemsApi = {

  async getAll() {
    const response = await apiClient.get("/item");
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to load items (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async create(item) {
    const response = await apiClient.post("/item", {
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price),
      tax: item.tax ? parseFloat(item.tax) : null,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to add item");
    }
    
    return response.json();
  },

  async update(id, item) {
    const response = await apiClient.put(`/item/${id}`, {
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price),
      tax: item.tax ? parseFloat(item.tax) : null,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to update item");
    }
    
    return response.json();
  },
  async delete(id) {
    const response = await apiClient.delete(`/item/${id}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to delete item");
    }
  },
};
