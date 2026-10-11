<template>
  <div class="py-10 w-5/6 mx-auto text-black">
    <h1 class="text-3xl font-semibold text-left mb-2">My Account</h1>
    <p v-if="auth.user" class="text-sm text-gray-500 mb-6">
      {{ auth.user.email }}
    </p>

    <div class="flex gap-2 mb-6">
      <button
        @click="tab = 'orders'"
        :class="tab === 'orders' ? activeTab : inactiveTab"
      >
        Order History
      </button>
      <button
        @click="tab = 'files'"
        :class="tab === 'files' ? activeTab : inactiveTab"
      >
        My Design Files
      </button>
    </div>

    <div v-if="tab === 'orders'">
      <p v-if="loadingOrders" class="text-sm text-gray-500">Loading your orders…</p>
      <p v-else-if="ordersError" class="text-sm text-red-700">{{ ordersError }}</p>
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
        <button
          @click="downloadInvoice(order)"
          class="bg-white text-black border-2 border-gray-200 px-4 py-2 rounded-xl mt-4 ml-2"
        >
          Download invoice (PDF)
        </button>
      </div>
    </div>

    <div v-else>
      <p class="text-sm text-gray-500 mb-4">
        Your files are stored securely in your account and can be reused
        anytime you order.
      </p>
      <p v-if="loadingFiles" class="text-sm text-gray-500">Loading your files…</p>
      <p v-else-if="filesError" class="text-sm text-red-700">{{ filesError }}</p>
      <p v-else-if="files.length === 0" class="text-sm text-gray-500">
        No saved files yet. Files you upload while logged in are kept here.
      </p>

      <div
        v-for="f in files"
        :key="f.id"
        class="bg-white rounded-xl px-8 py-4 mb-3 flex justify-between items-center gap-4 flex-wrap"
      >
        <div>
          <p class="font-semibold">{{ f.name }}</p>
          <p class="text-sm text-gray-500">
            {{ formatSize(f.size) }} · {{ formatDate(f.uploadedAt) }}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="downloadFile(f.id)"
            class="bg-white text-black border-2 border-gray-200 px-4 py-2 rounded-xl"
          >
            Download
          </button>
          <button
            @click="deleteFile(f.id)"
            class="bg-white text-red-700 border-2 border-red-200 px-4 py-2 rounded-xl"
          >
            Delete
          </button>
        </div>
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

interface FileMeta {
  id: string;
  name: string;
  size?: number;
  uploadedAt?: string;
}

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const tab = ref<"orders" | "files">("orders");
const activeTab = "bg-main text-white px-4 py-2 rounded-xl";
const inactiveTab =
  "bg-white text-black border-2 border-gray-200 px-4 py-2 rounded-xl";

const orders = ref<OrderDoc[]>([]);
const loadingOrders = ref(true);
const ordersError = ref<string | null>(null);
const reordering = ref(false);

const files = ref<FileMeta[]>([]);
const loadingFiles = ref(true);
const filesError = ref<string | null>(null);

function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-NZ");
}

function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function authHeaders() {
  const token = await auth.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

onMounted(async () => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/my-orders`,
      { headers: await authHeaders() }
    );
    orders.value = res.data.orders ?? [];
  } catch (e) {
    console.error("Unable to load orders:", e);
    ordersError.value = "Could not load your orders. Please try again.";
  } finally {
    loadingOrders.value = false;
  }
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/my-files`,
      { headers: await authHeaders() }
    );
    files.value = res.data.files ?? [];
  } catch (e) {
    console.error("Unable to load files:", e);
    filesError.value = "Could not load your files. Please try again.";
  } finally {
    loadingFiles.value = false;
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

async function downloadFile(id: string) {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/my-files/${id}/download`,
      { headers: await authHeaders() }
    );
    window.open(res.data.fileUrl, "_blank", "noopener");
  } catch (e) {
    console.error("Unable to get download link:", e);
    toast.error("Could not download that file.");
  }
}

async function deleteFile(id: string) {
  if (!confirm("Delete this file? This cannot be undone.")) return;
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/my-files/${id}`, {
      headers: await authHeaders(),
    });
    files.value = files.value.filter((f) => f.id !== id);
    toast.success("File deleted.");
  } catch (e) {
    console.error("Unable to delete file:", e);
    toast.error("Could not delete that file.");
  }
}

async function downloadInvoice(order: OrderDoc) {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/my-orders/${order.id}/invoice`,
      { headers: await authHeaders(), responseType: "blob" }
    );
    const url = URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.orderNumber ?? order.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Unable to download invoice:", e);
    toast.error("Could not download the invoice.");
  }
}

async function logout() {
  await auth.logout();
  router.push("/");
}
</script>
