/** @odoo-module **/
import { mount } from "@odoo/owl";
import { Root } from "./root.js";  // Update path to go up one directory
import { Login } from "./src/components/login.js";
import { MainPage } from "./src/components/main.js";
import { Settings } from "./src/components/settings.js";

const routes = [
    { path: '/login', component: Login },
    { path: '/main', component: MainPage },
    { path: '/settings', component: Settings },
    { path: '/', component: Login } // Default route
];

// Initialize the application
function setup() {
    mount(Root, document.body, { 
        props: { routes }
    });
}

window.addEventListener("load", setup);