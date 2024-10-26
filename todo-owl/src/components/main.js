import { Component, useState, useRef, onWillStart, onMounted, xml } from "@odoo/owl";
import { api } from "../controllers/api";
import styles from '../styles/Main.module.css';
import { websocketService } from '../services/socket';

class MainPage extends Component {
    setup() {
        this.state = useState({
            displayUsername: "",
            todos: [],
            isEditDialogOpen: false,
            currentTodo: null,
            categories: [],
            searchTerm: "",
            selectedCategory: "All Categories"
        });

        this.webSocket = useRef("webSocket");

        onWillStart(async () => {
            await this.fetchUsername();
            await this.loadCategories();
        });

        onMounted(() => {
            this.initWebSocket();
            this.loadSavedCategory();
        });
    }
    
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


   

    async fetchUsername() {
        try {
            const response = await api.fetchUser();
            if (response.ok) {
                const user = await response.json();
                this.state.displayUsername = `Welcome, ${user.username}`;
            } else {
                alert("Failed to fetch user details.");
            }
        } catch (error) {
            alert("Error fetching user details:", error);
        }
    }

    async loadCategories() {
        try {
            const response = await api.fetchCategories();
            const customCategories = await response.json();
            const defaultCategories = ["Work", "Personal", "Other"];
            this.state.categories = [
                ...customCategories.map((category) => category.category_name),
                ...defaultCategories,
            ];
        } catch (error) {
            alert("Error loading categories:", error);
        }
    }

    loadSavedCategory() {
        const savedCategory = localStorage.getItem("selectedCategory");
        if (savedCategory) {
            this.state.selectedCategory = savedCategory;
        }
    }

    handleSettingsClick() {
       
        window.location.hash = '/settings';
    }

    async handleLogout() {
        try {
            const response = await api.logout();
            if (response.ok) {
                window.location.hash = '/';
            } else {
                alert("Failed to log out.");
            }
        } catch (error) {
            alert("Error during logout:", error);
        }
    }
    async handleToggleDone(todo) {
        const updatedTodo = {
            ...todo,
            done: !todo.done
        };

        try {
            this.state.todos = this.state.todos.map((t) =>
                t.id === todo.id ? updatedTodo : t
            );

            const response = await api.updateTodo(todo.id, updatedTodo);
            if (!response.ok) {
                this.state.todos = this.state.todos.map((t) =>
                    t.id === todo.id ? todo : t
                );
                throw new Error('Failed to update todo');
            }
            await websocketService.sendMessage({
                type: 'todoUpdated',
                data: updatedTodo
            });

        } catch (error) {
            console.error("Error updating todo status:", error);
            this.state.todos = this.state.todos.map((t) =>
                t.id === todo.id ? todo : t
            );
        }
    }

    async handleAddTodo(ev) {
        ev.preventDefault();
        const formData = new FormData(ev.target);
        const newTodo = {
            title: formData.get("todoTitle"),
            description: formData.get("todoDescription"),
            date_time: formData.get("todoDateTime"),
            category: formData.get("todoCategory"),
        };

        try {
            const response = await api.addTodo(newTodo);
            if (response.ok) {
                const addedTodo = await response.json();
                this.state.todos.push(addedTodo);
                ev.target.reset();
                alert.success("Todo added successfully");
            } else {
                throw new Error("Failed to add todo");
            }
        } catch (error) {
            alert(error.message || "Error adding todo");
        }
    }
    handleEditTodo(todo) {
        this.state.currentTodo = todo;
        this.state.isEditDialogOpen = true;
    }

    async handleDeleteTodo(todoId) {
        try {
            await api.deleteTodo(todoId);
            this.state.todos = this.state.todos.filter((todo) => todo.id !== todoId);
        } catch (error) {
            alert("Error deleting todo:", error);
        }
    }

    async handleSaveChanges(ev) {
        ev.preventDefault();
        const formData = new FormData(ev.target);
        const updatedTodo = {
            ...this.state.currentTodo,
            title: formData.get("editTitle"),
            description: formData.get("editDescription"),
            date_time: formData.get("editDate"),
            category: formData.get("editCategory"),
        };

        try {
            const response = await api.updateTodo(this.state.currentTodo.id, updatedTodo);
            if (response.ok) {
                const updatedTodoData = await response.json();
                this.state.todos = this.state.todos.map((todo) =>
                    todo.id === this.state.currentTodo.id ? updatedTodoData : todo
                );
                this.state.isEditDialogOpen = false;
                this.state.currentTodo = null;
                alert("Todo updated successfully");
            } else {
                throw new Error("Failed to update todo");
            }
        } catch (error) {
            alert(error.message || "Error updating todo");
        }
    }

    handleSearchInput(ev) {
        this.state.searchTerm = ev.target.value.toLowerCase();
    }

    get filteredTodos() {
        return this.state.todos.filter((todo) => {
            const matchesSearch = todo.title.toLowerCase().includes(this.state.searchTerm);
            const matchesCategory =
    this.state.selectedCategory === "All Categories" ||
    todo.category === this.state.selectedCategory;


            return matchesSearch && matchesCategory;
        });
    }
    static template = xml`
  <div class="${styles.container}">
    <nav class="${styles.navbar}">
        <h2>Todo App</h2>
        <div class="${styles.searchContainer}">
            <input
                t-att-value="state.searchTerm"
                t-on-input="handleSearchInput"
                type="text"
                class="${styles.searchInput}"
                placeholder="Search todos..."
            />
        </div>
        <span class="${styles.usernameDisplay}" t-esc="state.displayUsername"/>
    </nav>
    <div class="${styles.contentWrapper}">
        <div class="${styles.sidebar}">
            <button class="${styles.sidebarBtn}" t-on-click="handleSettingsClick">
                Settings
            </button>
            <button
                class="${styles.sidebarBtn} ${styles.logoutButton}"
                t-on-click="handleLogout"
            >
                Logout
            </button>
        </div>
        <div class="${styles.mainContent}" t-att-key="state.todos.length">
         <div class="${styles.headerSection}">
                <p>Sorting by: <t t-esc="state.selectedCategory"/></p>
            </div>
            
            <form class="${styles.todoForm}" t-on-submit.prevent="handleAddTodo">
                <input
                    type="text"
                    name="todoTitle"
                    placeholder="Enter todo title"
                    required="required"
                />
                <textarea
                    name="todoDescription"
                    placeholder="Enter todo description"
                    required="required"
                />
                <input type="datetime-local" name="todoDateTime" required="required" />
                <select name="todoCategory" required="required">
                    <option value="">Select a category</option>
                    <t t-foreach="state.categories" t-as="category" t-key="category">
                        <option t-att-value="category"><t t-esc="category"/></option>
                    </t>
                </select>
                <button type="submit">Add Todo</button>
            </form>
                <div class="${styles.todoList}">
            <t t-if="filteredTodos.length > 0">
                <t t-foreach="filteredTodos" t-as="todo" t-key="todo.id">
                    <t t-if="todo and todo.title">
                        <section class="${styles.todoItem}" t-att-class="{ '${styles.todoDone}': todo.done }">
                            <div class="${styles.todoHeader}">
                                <input 
                                    type="checkbox" 
                                    class="${styles.doneCheckbox}"
                                    t-att-checked="todo.done"
                                    t-on-change="() => this.handleToggleDone(todo)"
                                />
                                <h3 t-att-class="{ '${styles.titleDone}': todo.done }">
                                    <t t-esc="todo.title"/>
                                </h3>
                            </div>
                            <p t-att-class="{ '${styles.descriptionDone}': todo.done }">
                                <t t-esc="todo.description"/>
                            </p>
                            <time t-att-datetime="new Date(todo.date_time).toISOString()">
                                <t t-esc="new Date(todo.date_time).toLocaleString()"/>
                            </time>
                            <p>
                                <strong>Category:</strong> <t t-esc="todo.category"/>
                            </p>
                            <div class="${styles.buttonsContainer}">
                                <button
                                    class="${styles.editBtn}"
                                    t-on-click="() => this.handleEditTodo(todo)"
                                >
                                    Edit
                                </button>
                                <button
                                    class="${styles.deleteTodoBtn}"
                                    t-on-click="() => this.handleDeleteTodo(todo.id)"
                                >
                                    Delete
                                </button>
                            </div>
                        </section>
                    </t>
                </t>
            </t>
            <t t-else="">
                <p>No todos available.</p>
            </t>
            </div>
        </div>
    </div>
    <t t-if="state.isEditDialogOpen">
        <dialog class="${styles.dialog}" open="open">
            <form class="${styles.editForm}" t-on-submit.prevent="handleSaveChanges">
                <label for="editTitle">Title:</label>
                <input
                    type="text"
                    name="editTitle"
                    t-att-value="state.currentTodo?.title"
                    required="required"
                />
                <label for="editDescription">Description:</label>
                <textarea
                    name="editDescription"
                    t-att-value="state.currentTodo?.description"
                    required="required"
                />
                <label for="editDate">Date:</label>
                <input
                    type="datetime-local"
                    name="editDate"
                    t-att-value="state.currentTodo ? new Date(state.currentTodo.date_time).toISOString().slice(0, 16) : ''"
                    required="required"
                />
                <label for="editCategory">Category:</label>
                <select
                    name="editCategory"
                    t-att-value="state.currentTodo?.category"
                    required="required"
                >
                    <t t-foreach="state.categories" t-as="category" t-key="category">
                        <option t-att-value="category"><t t-esc="category"/></option>
                    </t>
                </select>
                <button class="${styles.dialogButtons}" type="submit">Save Changes</button>
                <button class="${styles.dialogButtons}" type="button" t-on-click="() => this.state.isEditDialogOpen = false">
                    Cancel
                </button>
            </form>
        </dialog>
    </t>
</div>

`;
}

export { MainPage };