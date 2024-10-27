import { mount } from "@odoo/owl";
import { Root } from "./root.js";  
import { Login } from "./src/components/login.js";
import { MainPage } from "./src/components/main.js";
import { Settings } from "./src/components/settings.js";

const routes = [
    { path: '/login', component: Login },
    { path: '/main', component: MainPage },
    { path: '/settings', component: Settings },
    { path: '/', component: Login } 
];

function setup() {
    mount(Root, document.body, { 
        props: { routes }
    });
}

window.addEventListener("load", setup);