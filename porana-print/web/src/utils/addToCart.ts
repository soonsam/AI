import axios from "axios";
import { CartItem } from "../interfaces/interfaces";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

// Function to add item to cart
export async function addItemToCart(product: CartItem) {
  const cartId = localStorage.getItem("cartId") || undefined;
  console.log(cartId);
  const cartStore = useCartStore();
  const auth = useAuthStore();

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/add-item`,
      {
        cartId: cartId,
        item: product,
        // Logged-in users get their cart linked for order history.
        uid: auth.user?.uid ?? null,
      }
    );

    // Set the cart ID in localStorage if it's not already present
    if (!cartId) {
      localStorage.setItem("cartId", response.data.cartId);
    }

    cartStore.addToCart();
    
  } catch (error) {
    console.error("Unable to add item to cart:", error);
  }
}
