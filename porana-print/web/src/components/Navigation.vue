<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCartStore } from "../stores/cartStore";
import { useAuthStore } from "../stores/authStore";
import QuickLinks from "./QuickLinks.vue";

const cartStore = useCartStore();
const cartItems = computed(() => cartStore.cartItems);

const authStore = useAuthStore();
const authUser = computed(() => authStore.user);
const displayName = computed(() => {
  const name = authUser.value?.displayName?.trim();
  if (name) return name.split(" ")[0];
  return authUser.value?.email.split("@")[0] ?? "";
});

const route = useRoute();
const router = useRouter();

async function logout() {
  await authStore.logout();
  if (route.meta.requiresAuth) {
    router.push("/");
  }
}
</script>

<template>
  <nav
    class="bg-main text-white w-full h-20 flex items-center justify-between px-6"
  >
    <div class="hidden sm:block">
      <a href="http://poranaprint.co.nz"
        ><img src="../images/logo.png" alt="" class="h-16 ml-6"
      /></a>
    </div>

    <div
      class="flex items-center justify-center sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2"
    >
      <RouterLink to="/">
        <p class="flex text-white text-2xl md:text-3xl font-semibold">
          PORANA PRINT&nbsp;
          <span class="hidden sm:block">& SIGNAGE</span>
        </p>
      </RouterLink>
    </div>

    <div class="sm:mr-6 flex items-center">
      <a
        class="items-center hidden lg:flex rounded-lg px-4 py-2 hover:bg-cblue hover:bg-opacity-10"
        href="tel:09-443-5121"
      >
        <img src="../images/headphones.png" alt="" class="h-7 mr-1.5 mb-1" />
        <div class="text-center text-white mr-2 hover:text-white">
          <p>Help is here</p>
          <p class="text-sm">09-443-5121</p>
        </div>
      </a>
      <RouterLink
        to="/cart"
        class="flex items-center text-white hover:text-white sm:px-5 py-3 rounded-lg hover:bg-cblue hover:bg-opacity-10"
      >
        <img src="../images/cart.png" alt="" class="h-7 mr-0.5 mb-1" /><span
          class="hidden sm:block"
          >CART
        </span>
        <span v-if="cartItems > 0" class="text-white"> ({{ cartItems }}) </span>
      </RouterLink>
      <RouterLink
        v-if="!authUser"
        to="/login"
        class="flex items-center text-white hover:text-white sm:px-5 py-3 rounded-lg hover:bg-cblue hover:bg-opacity-10"
      >
        <span class="hidden sm:block">LOG IN</span>
      </RouterLink>
      <div v-else class="flex items-center">
        <RouterLink
          to="/account"
          class="hidden sm:block text-white hover:text-white sm:px-3 py-3"
        >
          Hi, {{ displayName }}
        </RouterLink>
        <button
          @click="logout"
          class="text-white sm:px-3 py-3 rounded-lg hover:bg-cblue hover:bg-opacity-10"
        >
          <span class="hidden sm:block">LOG OUT</span>
        </button>
      </div>
    </div>
  </nav>
  <QuickLinks />
</template>
