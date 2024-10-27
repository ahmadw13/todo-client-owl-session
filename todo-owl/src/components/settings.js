// Defines the Settings component, for application settings
// Handles user input, updates application state, and interacts with the WebSocket service to manage settings and data synchronization.
import { Component, useState, useRef, onWillStart, xml, onMounted } from "@odoo/owl";
import { api } from "../controllers/api";
import settingsStyles from '../styles/scss/Settings.module.scss';
import { websocketService } from "../services/socket";

class Settings extends Component {
    async initWebSocket() {
        try {
            this.state.isLoading = true;
      
            websocketService.subscribe("todos", (todos) => {
              const validTodos = todos.filter((todo) => todo && todo.title);
              this.state.todos = validTodos;
              this.state.isLoading = false;
            });
      
            websocketService.subscribe("todoUpdated", (updatedTodo) => {
              this.state.todos = this.state.todos.map((todo) =>
                todo.id === updatedTodo.id ? updatedTodo : todo
              );
            });
      
            await websocketService.sendMessage({ type: "fetchTodos" });
          } catch (error) {
            console.error("Error initializing WebSocket:", error);
            this.state.isLoading = false;
          }
    }
    

    setup() {
        this.state = useState({
            customCategories: [],
            selectedCategory: "All Categories",
            customCategoryInput: "",
            selectedCategoryForDeletion: "",
            todos: []
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
    
    handleDeleteCategory = async () => {
        const categoryId = this.state.selectedCategoryForDeletion;
        if (!categoryId) {
            this.state.deletionWarning = true; 
            return;
        }
        this.state.deletionWarning = false;
        if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
            try {
                const response = await api.deleteCategory(categoryId);
                if (response.ok) {
                    alert("Category deleted successfully.");
                    await this.loadCategoriesSettings(); 
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || "Failed to delete category.");
                }
            } catch (error) {
                alert("Error deleting category: " + error.message);
            }
        }
    };
    handleSaveCategory(ev) {
        ev.preventDefault();
        localStorage.setItem("selectedCategory", this.state.selectedCategory);
        alert("Category saved successfully!");
    }

    async handleAddCustomCategory() {
        if (this.state.customCategoryInput.trim()) {
            try {
                const categoryToAdd = this.state.customCategoryInput;
                await this.saveCustomCategoryToDatabase(categoryToAdd);
                this.state.customCategoryInput = "";  
                await this.loadCategoriesSettings();
                alert(`Custom category "${categoryToAdd}" added!`); 
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
                    await this.loadCategoriesSettings(); 
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

        <div class="${settingsStyles.deleteCategoryContainer}">
            <h2 class="${settingsStyles.deleteCategoryHeader}">Delete a Custom Category</h2>
            <label class="${settingsStyles.categoryLabel}" for="category-delete">Select Category to Delete:</label>
            <select class="${settingsStyles.categorySelect}" t-model="state.selectedCategoryForDeletion">
                <option value="">Select a category</option>
                <t t-foreach="state.customCategories" t-as="category" t-key="category.id">
                    <option t-att-value="category.id" t-esc="category.category_name"/>
                </t>
            </select>
            <div class="${settingsStyles.buttonContainer}">
              <button class="${settingsStyles.dangerBtn}" type="button" t-on-click="handleDeleteCategory">Delete Selected Category</button>
            </div>            <t t-if="state.deletionWarning">
                <p class="${settingsStyles.warningMessage}">Please select a category to delete.</p>
            </t>
        </div>
    </div>
</div>

    `;
}

export { Settings };
