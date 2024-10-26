import { Component, useState, useRef, onWillStart, xml, onMounted } from "@odoo/owl";
import { api } from "../controllers/api";
import settingsStyles from '../styles/Settings.module.css';

class Settings extends Component {
    async initWebSocket() {
        return new Promise((resolve, reject) => {
            this.webSocket.current = new WebSocket("ws://localhost:3000/ws/todos");
    
            this.webSocket.current.onopen = () => {
                this.webSocket.current.send(JSON.stringify({ type: "fetchTodos" }));
            };
    
            this.webSocket.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
    
                if (data.type === "todos") {
                    const validTodos = data.data.filter((todo) => todo && todo.title);
                    this.state.todos = validTodos; // Update the state with valid todos
                    resolve(validTodos); // Resolve the promise with valid todos
                }
            };
    
            this.webSocket.current.onerror = (error) => {
                console.error("WebSocket error observed:", error);
                reject(new Error("WebSocket error: " + error.message)); // Reject the promise in case of error
            };
    
            this.webSocket.current.onclose = () => {
                console.log("WebSocket connection closed. Attempting to reconnect...");
                reject(new Error("WebSocket connection closed")); // Reject the promise on close
            };
        });
    }
    

    setup() {
        this.state = useState({
            customCategories: [],
            selectedCategory: "All Categories",
            customCategoryInput: "",
            todos: [] // Make sure to initialize the todos state
        });

        this.fileInputRef = useRef("fileInput");
        this.webSocket = useRef("webSocket");

        onMounted(() => {
            this.initWebSocket();
        });

        onWillStart(async () => {
            await this.loadCategoriesSettings();
        });
    }

    handleMainClick() {
        window.location.hash = '/main';
    }

    async loadCategoriesSettings() {
        try {
            const response = await api.fetchCategories();
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch custom categories");
            }
            const data = await response.json();
            this.state.customCategories = data;
        } catch (error) {
            alert(`Error loading categories: ${error.message}`);
        }
    }

    async handleBackup() {
        try {
            
            const todos = await this.initWebSocket();  
            const categoriesResponse = await api.fetchCategories(); 
    
            if (!categoriesResponse.ok) {
                const errorData = await categoriesResponse.json();
                throw new Error(errorData.message || "Failed to fetch categories");
            }
     
    
            const backupData = { todos, categories };  
    
            const blob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "backup.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("Backup downloaded successfully!");
        } catch (error) {
            alert(`Error during backup: ${error.message}`);
        }
    }
    

    handleSaveCategory(ev) {
        ev.preventDefault();
        localStorage.setItem("selectedCategory", this.state.selectedCategory);
        alert("Category saved successfully!");
    }

    async handleAddCustomCategory() {
        if (this.state.customCategoryInput.trim()) {
            try {
                await this.saveCustomCategoryToDatabase(this.state.customCategoryInput);
                this.state.customCategoryInput = "";
                await this.loadCategoriesSettings();
                alert(`Custom category "${this.state.customCategoryInput}" added!`);
            } catch (error) {
                alert(`Error adding custom category: ${error.message}`);
            }
        } else {
            alert("Please enter a custom category.");
        }
    }

    handleRestore(ev) {
        const file = ev.target.files[0];
        if (!file) {
            alert("Please select a file to restore.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);

                for (const todo of backupData.todos) {
                    await api.addTodo(todo);
                }

                for (const category of backupData.categories) {
                    await api.saveCategory(category.category_name);
                }

                alert("Data restored successfully!");
                // Optionally refresh the custom categories
                await this.loadCategoriesSettings();
            } catch (error) {
                alert(`Error restoring data: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    async saveCustomCategoryToDatabase(category) {
        try {
            const response = await api.saveCategory(category);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save custom category");
            }
        } catch (error) {
            throw new Error(error.message || "Error saving custom category");
        }
    }

    async handleDeleteAllTodos() {
        if (confirm("Are you sure you want to delete all todos? This action cannot be undone.")) {
            try {
                const response = await api.deleteAllTodos();
                if (response.ok) {
                    alert("All todos deleted successfully.");
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || "Failed to delete todos.");
                }
            } catch (error) {
                alert("Error deleting all todos: " + error.message);
            }
        }
    }

    async handleDeleteAllCategories() {
        if (confirm("Are you sure you want to delete all custom categories? This action cannot be undone.")) {
            try {
                const response = await api.deleteAllCategories();
                if (response.ok) {
                    alert("All custom categories deleted successfully.");
                    await this.loadCategoriesSettings(); // Refresh categories
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || "Failed to delete custom categories.");
                }
            } catch (error) {
                alert("Error deleting custom categories: " + error.message);
            }
        }
    }

    static template = xml`
    <div>
        <nav class="${settingsStyles.navbar}">
            <h2 class="${settingsStyles.navbarTitle}">Todo App Settings</h2>
        </nav>
        <div class="${settingsStyles.sidebar}">
            <button class="${settingsStyles.sidebarBtn}" t-on-click="handleMainClick">Home</button>
        </div>
        <div class="${settingsStyles.mainContent}">
            <h1 class="${settingsStyles.settingsHeader}">Settings</h1>
            <form class="${settingsStyles.categoryForm}" t-on-submit="handleSaveCategory">
                <label for="todo-category">Select Category To Sort By:</label>
                <select class="${settingsStyles.categorySelect}" t-model="state.selectedCategory">
                    <option value="All Categories">All Categories</option>
                    <t t-foreach="state.customCategories" t-as="category" t-key="category.id">
                        <option t-att-value="category.category_name" t-esc="category.category_name"/>
                    </t>
                    <t t-foreach="['Work', 'Personal', 'Other']" t-as="category" t-key="category">
                        <option t-att-value="category" t-esc="category"/>
                    </t>
                </select>
                <button class="${settingsStyles.saveButton}" type="submit">Save Category</button>
            </form>
            <p>Selected Category: <span id="selected-category" t-esc="state.selectedCategory"/></p>
            <div class="${settingsStyles.actionButtons}">
                <button class="${settingsStyles.dangerBtn}" t-on-click="handleDeleteAllCategories">Delete All Categories</button>
                <button class="${settingsStyles.dangerBtn}" t-on-click="handleDeleteAllTodos">Delete All Todos</button>
                <button class="${settingsStyles.backupBtn}" t-on-click="handleBackup">Backup Todos</button>
                <button class="${settingsStyles.restoreBtn}" t-on-click="() => this.fileInputRef.el.click()">Restore Data</button>
                <input type="file" t-ref="fileInput" t-on-change="handleRestore" accept=".json" style="display: none;"/>
            </div>
            <div class="${settingsStyles.customCategoryContainer}">
                <h2 class="${settingsStyles.customCategoryHeader}">Add a Custom Category</h2>
                <input class="${settingsStyles.customCategoryInput}" type="text" t-model="state.customCategoryInput" placeholder="Enter custom category"/>
                <button class="${settingsStyles.addCustomCategoryBtn}" type="button" t-on-click="handleAddCustomCategory">Add Category</button>
            </div>
        </div>
    </div>
    `;
}

export { Settings };
