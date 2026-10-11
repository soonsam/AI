<template>
  <div class="py-10 w-5/6 mx-auto text-black">
    <h1 class="text-3xl font-semibold text-left mb-2">My Account</h1>
    <p v-if="auth.user" class="text-sm text-gray-500 mb-6">
      {{ auth.user.email }}
    </p>

    <h2 class="text-2xl font-semibold mb-3">Order History</h2>

    <p v-if="loading" class="text-sm text-gray-500">Loading your orders…</p>
    <p v-else-if="error" class="text-sm text-red-700">{{ error }}</p>
    <p v-else-if="orders.length === 0" class="text-sm text-gray-500">
      No orders yet. Orders placed while logged in will appear here.
    </p>

    <div
      v-for="order in orders"
      :key="order.id"
      class="bg-white rounded-xl px-8 py-6 mb-4"
    >
      <div class="flex justify-between items-center flex-wrap gap-2">
        <span class="text-xl font-semibold">Order #{{ order.orderNumber }}</span>
        <span class="text-xl"
          >${{ Number(order.totalAmount).toFixed(2) }}
          {{ String(order.currency || "").toUpperCase() }}</span
        >
      </div>
      <p v-if="order.createdAt" class="text-sm text-gray-500 mt-1">
        {{ formatDate(order.createdAt) }}
      </p>

      <div class="mt-3 border-t border-gray-100 pt-3">
        <div
          v-for="(item, i) in order.items || []"
          :key="i"
          class="flex justify-between text-sm py-1 gap-4"
        >
          <span>{{ item.description }} × {{ item.quantity }}</span>
          <span>${{ ((item.amount_total || 0) / 100).toFixed(2) }}</span>
        </div>
      </div>

      <button
        @click="reorder(order)"
        :disabled="reordering"
        class="bg-main text-white px-4 py-2 rounded-xl mt-4 disabled:opacity-50"
      >
        Reorder these items
      </button>
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
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useToast } from "vue-toastification";
import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { addItemToCart } from "../utils/addToCart";
import type { CartItem } from "../interfaces/interfaces";

useHead({
  title: "My Account | Porana Print",
  meta: [{ name: "robots", content: "noindex, follow" }],
});

interface OrderLineItem {
  description?: string;
  quantity?: number;
  amount_total?: number;
}

interface OrderSourceItem {
  id: string;
  quantity: number;
  options: string;
  fileUrl: string;
  message: string;
}

interface OrderDoc {
  id: string;
  orderNumber?: number;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  items?: OrderLineItem[];
  sourceItems?: OrderSourceItem[];
}

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const orders = ref<OrderDoc[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const reordering = ref(false);

function formatDate(value: string): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-NZ");
}

onMounted(async () => {
  try {
    const token = await auth.getIdToken();
    if (!token) {
      error.value = "Please log in again.";
      return;
    }
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/my-orders`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    orders.value = res.data.orders ?? [];
  } catch (e) {
    console.error("Unable to load orders:", e);
    error.value = "Could not load your orders. Please try again.";
  } finally {
    loading.value = false;
  }
});

async function reorder(order: OrderDoc) {
  if (!order.sourceItems?.length) {
    toast.error("These items can no longer be reordered online.");
    return;
  }
  reordering.value = true;
  try {
    for (let i = 0; i < order.sourceItems.length; i++) {
      const src = order.sourceItems[i];
      const product: CartItem = {
        uid: `${Date.now()}-${i}`,
        id: src.id,
        quantity: src.quantity,
        options: src.options || "",
        fileUrl: src.fileUrl || "",
        message: src.message || "",
      };
      await addItemToCart(product);
    }
    toast.success("Items added to cart! Please check your files.");
    router.push("/cart");
  } finally {
    reordering.value = false;
  }
}

async function logout() {
  await auth.logout();
  router.push("/");
}
</script>
