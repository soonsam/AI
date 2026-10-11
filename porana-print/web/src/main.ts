import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createHead } from "@unhead/vue/client";
import { useAuthStore } from "./stores/authStore";

const app = createApp(App);
const pinia = createPinia();
const head = createHead();

pinia.use(piniaPluginPersistedstate);

app.use(router);
app.use(Toast, {
  timeout: 3000,
  position: "top-right",
});
app.use(pinia);
useAuthStore().init();
app.use(head);

app.mount("#app");
