import { Component, xml, useState, onMounted } from "@odoo/owl";
class Router extends Component {
  static template = xml`
        <div>
            <t t-if="state.currentComponent">
                <t t-component="state.currentComponent" t-props="state.props"/>
            </t>
        </div>
    `;

  static props = ["routes"];

  setup() {
    const state = useState({
      currentComponent: null,
      props: {},
    });

    const updateRoute = () => {
      const hash = window.location.hash.slice(1) || "/";
      const route =
        this.props.routes.find((r) => r.path === hash) || this.props.routes[0];
      state.currentComponent = route.component;
      state.props = route.props || {};
    };

    onMounted(() => {
      updateRoute();
      window.addEventListener("hashchange", updateRoute);
    });

    this.state = state;
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export class Root extends Component {
  static template = xml`
        <Router routes="routes"/>
    `;

  static components = { Router };

  static props = ["routes"];

  setup() {
    this.routes = this.props.routes;
  }
}
