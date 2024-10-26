// api.js

const API_BASE_URL = "http://localhost:3000";
import { websocketService } from '../services/socket';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch");
    }
    return response;
};

const handleAuthResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Authentication failed");
    }
    return response;
};

export const api = {
    fetchUser: () =>
        fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" }).then(
            handleResponse
        ),

    fetchCategories: () =>
        fetch(`${API_BASE_URL}/categories/custom-categories`, {
            credentials: "include",
        }).then(handleResponse),

        fetchTodos: async (callback) => {
            try {
                websocketService.subscribe("todos", callback);
                await websocketService.sendMessage({ type: "fetchTodos" });
            } catch (error) {
                console.error("Error fetching todos:", error);
                throw error;
            }
        },
    
        closeWebSocket: () => {
            websocketService.disconnect();
        },

    closeWebSocket: () => closeSocket(), // Call to close WebSocket

    addTodo: (todoData) =>
        fetch(`${API_BASE_URL}/todo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(todoData),
        }).then(handleResponse),

    deleteAllTodos: () =>
        fetch(`${API_BASE_URL}/todo/all`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        }),

    saveCategory: (category) =>
        fetch(`${API_BASE_URL}/categories/custom-categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ category }),
        }).then(handleResponse),

    updateTodo: (todoId, todoData) =>
        fetch(`${API_BASE_URL}/todo/${todoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(todoData),
        }).then(handleResponse),

    deleteAllCategories: () =>
        fetch(`${API_BASE_URL}/categories/custom-categories`, {
            method: "DELETE",
            credentials: "include",
        }),

    deleteTodo: (todoId) =>
        fetch(`${API_BASE_URL}/todo/${todoId}`, {
            method: "DELETE",
            credentials: "include",
        }).then(handleResponse),

    logout: () =>
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        }).then(handleResponse),

    login: (username, password) =>
        fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        }).then(handleAuthResponse),

    register: (username, password) =>
        fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        }).then(handleAuthResponse),
};
