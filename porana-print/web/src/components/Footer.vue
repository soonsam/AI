<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { ring } from "ldrs";
import axios from "axios";

// 상태 변수 정의
const name = ref("");
const email = ref("");
const details = ref("");
const isSending = ref(false);

// 로딩 애니메이션 등록
if (typeof window !== "undefined") {
  ring.register();
}

// 문의 전송 함수
const sendQuoteRequest = async () => {
  if (isSending.value) return;

  const toast = useToast();

  if (!name.value || !email.value || !details.value) {
    toast.error("Please fill in all the required fields.");
    return;
  }

  isSending.value = true;
  try {
    await axios.post(
      `${import.meta.env.VITE_API_URL}/send-inquiry`,
      {
        name: name.value,
        email: email.value,
        details: details.value,
        subject: "New Contact Form Inquiry - poranaprint.co.nz",
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    toast.success("Your inquiry has been sent successfully!");
    name.value = "";
    email.value = "";
    details.value = "";
  } catch (error) {
    console.error("Error:", error);
    toast.error("An error occurred while sending your request.");
  } finally {
    isSending.value = false;
  }
};
</script>

<template>
  <div class="w-screen bg-main text-white py-12">
    <div
      class="mx-auto w-5/6 justify-between flex flex-col gap-2 sm:flex-row mt-2"
    >
      <a
        href="tel:09-443-5121"
        class="w-full sm:w-1/3 text-main hover:text-white hover:bg-slate-700 bg-white rounded-xl px-3 py-2 text-center transition-colors"
        >09-443-5121 (Store)</a
      >
      <a
        href="tel:022-486-8114"
        class="w-full sm:w-1/3 text-main hover:text-white hover:bg-slate-700 bg-white rounded-xl px-3 py-2 text-center transition-colors"
        >022-486-8114 (Mobile)</a
      >
      <a
        href="mailto:info@poranaprint.co.nz"
        class="w-full sm:w-1/3 text-main hover:text-white hover:bg-slate-700 bg-white rounded-xl px-3 py-2 text-center transition-colors"
        >info@poranaprint.co.nz</a
      >
    </div>

    <div
      class="mx-auto w-5/6 justify-between flex flex-col gap-2 sm:flex-row mb-6 mt-2"
    >
      <a
        href="https://www.youtube.com/@stationerycityglenfield6706"
        target="_blank"
        class="w-full sm:w-1/4 text-white hover:text-red-600 hover:bg-white bg-red-600 rounded-xl px-3 py-2 text-center transition-colors"
        >Youtube</a
      >
      <a
        href="https://www.linkedin.com/company/stationery-city-glenfield/"
        target="_blank"
        class="w-full sm:w-1/4 text-white hover:text-blue-400 hover:bg-white bg-blue-400 rounded-xl px-3 py-2 text-center transition-colors"
        >LinkedIn</a
      >
      <a
        href="https://www.facebook.com/stationerycity/"
        target="_blank"
        class="w-full sm:w-1/4 text-white hover:text-slate-700 hover:bg-white bg-slate-700 rounded-xl px-3 py-2 text-center transition-colors"
        >Facebook</a
      >
      <a
        href="https://www.instagram.com/stationery.city.glenfield/"
        target="_blank"
        class="w-full sm:w-1/4 text-white hover:text-text hover:bg-white bg-text rounded-xl px-3 py-2 text-center transition-colors"
        >Instagram</a
      >
    </div>

    <div class="flex flex-col sm:flex-row w-5/6 mx-auto gap-8">
      <div class="w-full sm:w-1/2 flex flex-col">
        <div class="flex-grow">
          <p class="text-2xl font-semibold mb-4">About Us</p>
          <div class="space-y-4 opacity-90">
            <p>
              Porana Print provides a wide range of digital print and graphic
              design services with fast and efficient delivery. Our experienced,
              customer-oriented, friendly team offers practical solutions and
              expert value. We enjoy providing excellent printing, design and
              signage services to our clients to exceed their expectations.
            </p>
            <p>
              <a
                href="https://www.stationerycity.co.nz"
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-gray-300"
                >Stationery City</a
              >
              is the parent company of Porana Print, proudly serving nearby
              schools and offices with stationery, office furniture, and NZ Post
              services. We offer high-quality products at affordable prices, a
              wide range of the latest items, ample parking, fast delivery, and
              friendly staff—always ready to welcome and support our customers.
            </p>
            <p class="mb-6 font-medium">
              2A Porana Rd, Wairau Valley, Auckland 0627
            </p>
          </div>
        </div>

        <div class="w-full mt-4">
          <a
            href="https://www.google.com/maps/search/?api=1&query=2A+Porana+Road+Wairau+Valley+Auckland+0627"
            target="_blank"
            rel="noopener noreferrer"
            class="block group"
          >
            <img
              src="https://www.stationerycity.co.nz/wp-content/uploads/2026/02/google-map.jpg"
              alt="Stationery City Glenfield Location"
              class="w-full h-auto border-2 border-gray-400 rounded-xl shadow-lg transition-transform group-hover:scale-[1.01]"
            />
          </a>
          <p
            class="text-sm text-white mt-3 text-center sm:text-left opacity-80 italic"
          >
            Click the map image to open Google Maps.
          </p>
        </div>
      </div>

      <div class="w-full sm:w-1/2">
        <p class="text-2xl text-white font-bold mb-1">Contact Form</p>
        <div
          class="flex flex-col bg-white rounded-xl p-6 sm:p-6 h-full shadow-lg"
        >
          <div class="flex flex-col flex-grow">
            <div class="mb-2">
              <label class="block text-sm font-bold text-main mb-2"
                >Customer Details:</label
              >
              <input
                type="text"
                v-model="name"
                class="w-full bg-gray-50 text-black border-2 border-gray-200 rounded-lg text-sm px-4 py-3 focus:outline-none focus:border-main focus:bg-white transition-all"
                placeholder="Name"
              />
            </div>

            <div class="mb-5">
              <input
                type="email"
                v-model="email"
                class="w-full bg-gray-50 text-black border-2 border-gray-200 rounded-lg text-sm px-4 py-3 focus:outline-none focus:border-main focus:bg-white transition-all"
                placeholder="Email"
              />
            </div>

            <div class="flex flex-col flex-grow mb-5">
              <label
                for="message"
                class="block text-sm font-bold text-main mb-2"
                >Inquiry:</label
              >
              <textarea
                id="message"
                v-model="details"
                rows="8"
                class="w-full flex-grow bg-gray-50 text-gray-900 border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-main focus:bg-white transition-all resize-none"
                placeholder="What can we help you with?"
              ></textarea>
            </div>

            <button
              v-if="!isSending"
              @click="sendQuoteRequest"
              class="w-full bg-main text-white py-2 rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md"
            >
              Send Inquiry!
            </button>
            <div
              v-else
              class="w-full bg-gray-400 text-white py-2 rounded-xl font-bold text-lg flex items-center justify-center gap-3 cursor-not-allowed mt-auto"
            >
              <l-ring size="24" stroke="3" speed="1" color="white"></l-ring>
              Sending...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="border-t border-slate-700 mt-12 pt-5 w-5/6 mx-auto">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Policy links -->
        <div class="flex gap-6">
          <RouterLink
            to="/terms-and-conditions"
            class="text-slate-400 text-xs hover:text-white transition-colors border-b border-slate-600 pb-px"
          >
            Terms &amp; Conditions
          </RouterLink>
          <RouterLink
            to="/shipping-and-returns"
            class="text-slate-400 text-xs hover:text-white transition-colors border-b border-slate-600 pb-px"
          >
            Shipping &amp; Returns
          </RouterLink>
         <RouterLink
            to="/opening-hours"
            class="text-slate-400 text-xs hover:text-white transition-colors border-b border-slate-600 pb-px"
          >
            Opening Hours
          </RouterLink>
        </div>

        <!-- Payment logos -->
        <div
          class="flex items-center gap-2 flex-wrap justify-center sm:justify-end"
        >
          <span class="text-slate-500 text-xs mr-1">We accept:</span>

          <!-- Visa -->
          <div
            class="bg-[#1a1f71] rounded px-2.5 py-1 inline-flex items-center h-[26px]"
          >
            <span class="text-white text-[12px] font-extrabold tracking-widest"
              >VISA</span
            >
          </div>

          <!-- Mastercard -->
          <div
            class="bg-white border border-slate-200 rounded inline-flex items-center h-[26px] w-[40px] relative"
          >
            <div
              class="w-[15px] h-[15px] bg-[#eb001b] rounded-full absolute left-[6px]"
            ></div>
            <div
              class="w-[15px] h-[15px] bg-[#f79e1b] rounded-full absolute right-[6px] opacity-95"
            ></div>
          </div>

          <!-- American Express -->
          <div
            class="bg-[#006FCF] rounded px-2 py-1 inline-flex items-center h-[26px]"
          >
            <span class="text-white text-[10px] font-extrabold tracking-wide"
              >AMEX</span
            >
          </div>

          <!-- JCB -->
          <div
            class="bg-white border border-slate-200 rounded px-2 py-1 inline-flex items-center h-[26px] gap-1.5"
          >
            <div class="flex gap-px">
              <div class="w-[6px] h-[6px] bg-[#0e4c96] rounded-full"></div>
              <div class="w-[6px] h-[6px] bg-[#0e4c96] rounded-full"></div>
            </div>
            <span class="text-[#0e4c96] text-[10px] font-bold tracking-wide"
              >JCB</span
            >
          </div>

          <!-- Afterpay -->
          <div
            class="bg-[#b2fce4] rounded px-2.5 py-1 inline-flex items-center h-[26px]"
          >
            <span
              class="text-[#006450] text-[11px] font-extrabold tracking-tight"
              >After</span
            ><span class="text-[#006450] text-[11px] font-normal">pay</span>
          </div>

          <!-- Alipay -->
          <div
            class="bg-[#1677ff] rounded px-2.5 py-1 inline-flex items-center h-[26px] gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" fill="white" fill-opacity="0.25" />
              <path
                d="M9 12.5L11 14.5L15 10.5"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span class="text-white text-[11px] font-bold tracking-wide"
              >Alipay</span
            >
          </div>
        </div>
      </div>

      <p class="text-slate-500 text-[11px] text-center mt-4">
        &copy; {{ new Date().getFullYear() }} Porana Print &amp; Stationery
        City. All rights reserved.
      </p>
    </div>
  </div>
</template>

<style scoped>
.bg-main {
  background-color: #0f172a;
}
.text-main {
  color: #0f172a;
}
.focus\:border-main:focus {
  border-color: #0f172a;
}
</style>
