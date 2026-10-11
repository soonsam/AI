<template>
  <div class="py-10 w-5/6 mx-auto text-black">
    <h1 class="text-3xl font-semibold text-left mb-2">My Account</h1>
    <p v-if="auth.user" class="text-sm text-gray-500 mb-6">
      {{ auth.user.email }}
    </p>

    <div class="grid sm:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl px-8 py-8">
        <h2 class="text-2xl font-semibold mb-3">Order History</h2>
        <p class="text-sm text-gray-500">
          Coming in the next update — your past orders will appear here.
        </p>
      </div>
      <div class="bg-white rounded-xl px-8 py-8">
        <h2 class="text-2xl font-semibold mb-3">My Design Files</h2>
        <p class="text-sm text-gray-500">
          Coming in the next update — your saved files will appear here.
        </p>
      </div>
    </div>

    <button
      @click="logout"
      class="bg-white text-black border-2 border-gray-200 px-4 py-2 rounded-xl mt-6"
    >
      Log Out
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useAuthStore } from "../stores/authStore";

useHead({
  title: "My Account | Porana Print",
  meta: [{ name: "robots", content: "noindex, follow" }],
});

const auth = useAuthStore();
const router = useRouter();

async function logout() {
  await auth.logout();
  router.push("/");
}
</script>
