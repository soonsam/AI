<template>
  <div class="py-10 w-5/6 max-w-md mx-auto">
    <div class="flex flex-col bg-white rounded-xl px-8 py-8 text-black">
      <h1 class="text-3xl font-semibold text-left mb-2">Create account</h1>
      <p class="text-sm text-gray-500 mb-6">
        One account for faster reorders and saved design files.
      </p>

      <button
        @click="google"
        :disabled="auth.busy"
        class="w-full bg-white text-black border-2 border-gray-200 rounded-xl px-4 py-2.5 mb-2 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <p class="text-center text-xs text-gray-400 my-4">— or with email —</p>

      <label for="register-name" class="text-sm">Full name:</label>
      <input
        id="register-name"
        v-model="name"
        type="text"
        autocomplete="name"
        class="bg-white text-black outline-none px-3 py-2 border-2 rounded-xl"
      />

      <label for="register-email" class="text-sm mt-3">Email:</label>
      <input
        id="register-email"
        v-model="email"
        type="email"
        autocomplete="email"
        class="bg-white text-black outline-none px-3 py-2 border-2 rounded-xl"
      />

      <label for="register-password" class="text-sm mt-3"
        >Password (min 6 characters):</label
      >
      <input
        id="register-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        @keyup.enter="passwordRegister"
        class="bg-white text-black outline-none px-3 py-2 border-2 rounded-xl"
      />

      <p v-if="auth.error" class="text-sm text-red-700 mt-3">{{ auth.error }}</p>

      <button
        @click="passwordRegister"
        :disabled="auth.busy"
        class="bg-main text-white px-4 py-2 rounded-xl mt-6 disabled:opacity-50"
      >
        Create Account
      </button>

      <p class="text-sm text-center mt-4">
        Already registered?
        <RouterLink
          :to="{ path: '/login', query: $route.query }"
          class="text-blue-600 hover:underline"
          >Log in</RouterLink
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
  title: "Create Account | Porana Print",
  meta: [
    {
      name: "description",
      content: "Create a Porana Print account for faster reorders and saved design files.",
    },
  ],
});

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");

function goNext() {
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : "/account";
  router.push(redirect);
}

async function passwordRegister() {
  if (await auth.register(name.value, email.value.trim(), password.value)) {
    goNext();
  }
}

async function google() {
  if (await auth.loginWithGoogle()) {
    goNext();
  }
}
</script>
