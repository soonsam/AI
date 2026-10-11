<template>
  <div class="text-black w-screen min-h-screen py-12 bg-white">
    <div class="flex flex-col sm:flex-row mx-10 sm:w-2/3 sm:mx-auto">
      <div class="sm:w-2/3">
        <p class="text-2xl font-semibold mb-2">Cart</p>
        <div v-if="cartItems.length > 0" class="w-full">
          <ul class="w-full">
            <li
              v-for="item in cartItems"
              :key="item.id"
              class="bg-white rounded-xl p-2 mb-2"
            >
              <div class="flex flex-col sm:flex-row items-center">
                <img
                  :src="item.image"
                  :alt="item.name"
                  class="w-20 h-20 rounded-lg"
                />
                <div class="sm:ml-4">
                  <span class="font-semibold">{{ item.name }}</span>
                  <br />
                  <span v-if="item.options" class="text-gray-600">{{
                    item.options
                  }}</span>
                  <br v-if="item.options" />
                  <span class="text-gray-800"
                    >${{ item.price.toFixed(2) }}</span
                  >
                  x <span>{{ item.quantity.toFixed(0) }}</span> =
                  <span>${{ item.totalPrice.toFixed(2) }}</span>
                  <p v-if="item.fileUrl" class="text-gray-600">
                    File URL:
                    <a :href="item.fileUrl" target="_blank">Click here</a>
                  </p>
                  <p v-if="item.message" class="text-gray-600">
                    Message: {{ item.message }}
                  </p>
                </div>
                <div class="ml-auto">
                  <button
                    @click="deleteItem(item.uid)"
                    class="bg-red-400 text-white py-1 px-2 text-sm hover:bg-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <hr class="mt-6" />
            </li>
          </ul>
        </div>
        <div v-else>
          <div v-if="isLoading === true">
            <l-bouncy size="45" speed="1.75" color="black"></l-bouncy>
          </div>
          <div v-else><p>Your cart is empty.</p></div>
        </div>
      </div>
      <div v-if="cartItems.length > 0" class="sm:w-1/3 sm:ml-6">
        <p class="text-xl font-semibold mb-2">Summary</p>
        <p class="text-sm">Shipping to:</p>
        <select
          v-model="selectedShippingOption"
          class="bg-white border px-3 py-2 rounded-lg w-full"
        >
          <option
            v-for="option in shippingOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>

        <div class="flex justify-between my-6 items-center">
          <span class="text-sm">Shipping Cost:</span>
          <p class="text-xl text-black">${{ shippingFees.toFixed(2) }}</p>
        </div>
        <div class="flex justify-between my-6 items-center">
          <span class="text-sm">Total (Cart + Shipping):</span>
          <p class="text-xl text-black">${{ totalPrice.toFixed(2) }}</p>
        </div>
        <div
          v-if="totalPrice.valueOf() < 2"
          class="flex justify-between my-6 items-center"
        >
          <span class="text-sm">Minimum Charge Fee:</span>
          <p class="text-xl text-black">${{ (2 - totalPrice).toFixed(2) }}</p>
        </div>
        <div class="flex justify-between mb-6 items-center">
          <span class="text-sm">Grand Total:</span>
          <p class="text-xl text-black">
            ${{ totalPrice < 2 ? (2).toFixed(2) : totalPrice.toFixed(2) }}
          </p>
        </div>
        <button
          v-if="!isProcessing"
          @click="createCheckout"
          class="text-white bg-main w-full"
        >
          Checkout
        </button>
        <button
          v-else
          class="mt-6 bg-slate-500 text-white py-2 px-4 rounded-lg flex items-center w-full justify-center"
        >
          Loading &nbsp;
          <l-ring
            size="20"
            stroke="3"
            bg-opacity="0"
            speed="1.5"
            color="white"
          ></l-ring>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from "@unhead/vue";

useHead({
  title: "Shopping Cart | Porana Print",
  meta: [
    { name: "description", content: "Review your cart before checking out with Porana Print." },
    { name: "robots", content: "noindex, follow" },
  ],
});

import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import axios from "axios";
import { ring } from "ldrs";
import { useCartStore } from "../stores/cartStore";
import { bouncy } from "ldrs";

bouncy.register();

interface CartItem {
  uid: string;
  id: string;
  quantity: number;
  options: string;
  totalPrice: number;
  image: string;
  name: string;
  price: number;
  fileUrl: string;
  message: string;
}

interface ShippingOption {
  id: string;
  label: string;
}

const cartItems = ref<CartItem[]>([]);
const totalPrice = ref(0);
const shippingFees = ref(0);
const selectedShippingOption = ref("shr_1QBP2WGB5LZAemm9uTtzotZc");
const shippingOptions = ref<ShippingOption[]>([]);
const toast = useToast();
const isProcessing = ref(false);
const isLoading = ref<boolean>(false);

ring.register();

onMounted(() => {
  fetchCartData();
  fetchShippingOptions();
});

async function fetchShippingOptions() {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/shipping-options`
    );
    shippingOptions.value = response.data;
  } catch (error) {
    console.error("Error fetching shipping options:", error);
    toast.error("Failed to load shipping options.");
  }
}

async function fetchCartData() {
  isLoading.value = true;
  const cartId = localStorage.getItem("cartId") || undefined;

  if (!cartId) {
    cartItems.value = [];
    totalPrice.value = 0;
    isLoading.value = false;
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/cart?cartId=${cartId}`
    );

    const data = await response.json();

    cartItems.value = data.cartItems;
    totalPrice.value = data.totalCartPrice;
  } catch (error) {
    console.error("Error:", error);
  }
  isLoading.value = false;
}

const deleteItem = async (itemToDeleteId: string) => {
  const cartStore = useCartStore();
  const cartId = localStorage.getItem("cartId") || undefined;

  console.log(itemToDeleteId);

  try {
    const response = await axios.delete(
      `${
        import.meta.env.VITE_API_URL
      }/remove-item?cartId=${cartId}&itemId=${itemToDeleteId}`
    );

    console.log(response.data);
  } catch (error) {
    console.error("Error:", error);
  }

  // Refresh cart data after deletion
  await fetchCartData();

  cartStore.removeFromCart();

  toast.success("Item removed!");
};

watch(selectedShippingOption, (newVal) => {
  fetchShippingPrice(newVal);
});

const createCheckout = async () => {
  isProcessing.value = true;

  const cartId = localStorage.getItem("cartId") || undefined;
  const shippingOption = selectedShippingOption.value;

  try {
    const checkoutPrice = totalPrice.value.toFixed(2);
    const response = await axios.post(
      `${
        import.meta.env.VITE_API_URL
      }/create-checkout-session?cart_id=${cartId}&shipping=${shippingOption}`,
      { totalPrice: checkoutPrice }
    );
    const url = response.data.url;

    if (url) {
      window.location.href = url;
    } else {
      console.error("Failed to get checkout URL.");
    }
  } catch (error) {
    console.error("Error during checkout:", error);
    toast.error("Stripe Error: Checkout total must be at least $0.50", {
      timeout: 5000,
    });
  }
  isProcessing.value = false;
};

const fetchShippingPrice = async (shippingId: string) => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/shipping/get-price?id=${shippingId}`
    );
    shippingFees.value = response.data;
    totalPrice.value =
      cartItems.value.reduce((total, item) => total + item.totalPrice, 0) +
      shippingFees.value;
  } catch (error) {
    console.error("Error fetching shipping price:", error);
  }
};
</script>

<style scoped>
h1 {
  font-size: 2em;
  margin-bottom: 0.5em;
}

ul {
  list-style-type: none;
  padding: 0;
}
</style>
