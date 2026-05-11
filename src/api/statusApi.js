import { apiClient } from "./client";

export const statusApi = {

  async getStatus() {
    const response = await apiClient.get("/status");
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Status request failed (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data || typeof data.status !== "string") {
      throw new Error("Invalid status response from server");
    }
    
    return data.status.toLowerCase();
  },

  async sendCommand(command) {
    const response = await apiClient.post(`/status/${command}`, {});
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Command failed (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data || typeof data.status !== "string") {
      throw new Error("Invalid command response from server");
    }
    
    return data.status.toLowerCase();
  },
};
