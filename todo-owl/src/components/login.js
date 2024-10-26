import { Component, useState, onWillStart, onWillUnmount, xml } from "@odoo/owl";
import { api } from "../controllers/api";
import styles from '../styles/Login.module.css';

class Login extends Component {
    static template = xml`
        <div class="${styles.body}">
            <div class="${styles.container}">
                <input
                    type="checkbox"
                    id="toggle-checkbox"
                    class="${styles.toggleCheckbox}"
                    t-att-checked="state.isRegistering"
                    t-on-change="toggleRegistering"
                />
                <div class="${styles.formWrapper}">
                    <t t-if="!state.isRegistering">
                        <div class="${styles.loginFormContainer}">
                            <form id="login-form" t-on-submit="handleLoginSubmit" class="${styles.formContainer}">
                                <h2 class="${styles.title}">Login</h2>
                                <input class="${styles.input}" type="text" name="username" placeholder="Username" required="required" />
                                <input class="${styles.input}" type="password" name="password" placeholder="Password" required="required" />
                                <button type="submit" class="${styles.button}">Login</button>
                                <p class="${styles.text}">
                                    Don't have an account?
                                    <label for="toggle-checkbox" class="${styles.toggleLabel}">Register</label>
                                </p>
                            </form>
                        </div>
                    </t>
                    <t t-else="">
                        <div class="${styles.registerFormContainer}">
                            <form id="register-form" t-on-submit="handleRegisterSubmit" class="${styles.formContainer}">
                                <h2 class="${styles.title}">Register</h2>
                                <input class="${styles.input}" type="text" name="username" placeholder="Username" required="required" />
                                <input class="${styles.input}" type="password" name="password" placeholder="Password" required="required" />
                                <button type="submit" class="${styles.button}">Register</button>
                                <p class="${styles.text}">
                                    Already have an account?
                                    <label for="toggle-checkbox" class="${styles.toggleLabel}">Login</label>
                                </p>
                            </form>
                        </div>
                    </t>
                </div>
            </div>
        </div>
    `;

    setup() {
        this.state = useState({
            isRegistering: false
        });

        onWillStart(() => {
            document.body.classList.add(styles.body);
        });

        onWillUnmount(() => {
            document.body.classList.remove(styles.body);
        });
    }

    async handleLoginSubmit(ev) {
        ev.preventDefault();
        const formData = new FormData(ev.target);
        const username = formData.get("username").trim();
        const password = formData.get("password").trim();
    
        try {
            const response = await api.login(username, password);
            if (response.ok) {
                window.location.hash = '/main';
            } else {
                const data = await response.json();
                alert(data.error || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            alert("An error occurred during login. Please try again.");
        }
    }

    async handleRegisterSubmit(ev) {
        ev.preventDefault();
        const formData = new FormData(ev.target);
        const username = formData.get("username").trim();
        const password = formData.get("password").trim();

        try {
            const response = await api.register(username, password);
            if (response.ok) {
                window.location.hash = '/main';
            } else {
                const data = await response.json();
                alert(data.error || "Registration failed. Please check your credentials.");
            }
        } catch (error) {
            alert("An error occurred during registration. Please try again.");
        }
    }

    toggleRegistering() {
        this.state.isRegistering = !this.state.isRegistering;
    }
}

export { Login };