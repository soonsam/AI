<template>
  <div class="py-10 w-5/6 max-w-md mx-auto">
    <div class="flex flex-col bg-white rounded-xl px-8 py-8 text-black">
      <h1 class="text-3xl font-semibold text-left mb-2">Welcome back</h1>
      <p class="text-sm text-gray-500 mb-6">
        Log in to check orders and reuse your design files.
      </p>

      <button
        @click="google"
        :disabled="auth.busy"
        class="w-full bg-white text-black border-2 border-gray-200 rounded-xl px-4 py-2.5 mb-2 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <p class="text-center text-xs text-gray-400 my-4">— or with email —</p>

      <label for="login-email" class="text-sm">Email:</label>
      <input
        id="login-email"
        v-model="email"
        type="email"
        autocomplete="email"
        class="bg-white text-black outline-none px-3 py-2 border-2 rounded-xl"
      />

      <label for="login-password" class="text-sm mt-3">Password:</label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        @keyup.enter="passwordLogin"
        class="bg-white text-black outline-none px-3 py-2 border-2 rounded-xl"
      />

      <p v-if="auth.error" class="text-sm text-red-700 mt-3">{{ auth.error }}</p>

      <button
        @click="passwordLogin"
        :disabled="auth.busy"
        class="bg-main text-white px-4 py-2 rounded-xl mt-6 disabled:opacity-50"
      >
        Log In
      </button>

      <p class="text-sm text-center mt-4">
        No account?
        <RouterLink
          :to="{ path: '/register', query: $route.query }"
          class="text-blue-600 hover:underline"
          >Create one</RouterLink
        >
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useAuthStore } from "../stores/authStore";

useHead({
  title: "Log In | Porana Print",
  meta: [
    {
      name: "description",
      content: "Log in to your Porana Print account to check orders and reuse design files.",
    },
  ],
});

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");

function goNext() {
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : "/account";
  router.push(redirect);
}

async function passwordLogin() {
  if (await auth.login(email.value.trim(), password.value)) {
    goNext();
  }
}

async function google() {
  if (await auth.loginWithGoogle()) {
    goNext();
  }
}
</script>
