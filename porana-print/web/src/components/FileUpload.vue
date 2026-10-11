<template>
    <div class="flex flex-col mb-4">
        <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            @change="handleFileUpload"
        />
        <button
            v-if="!isUploading"
            @click="submitFile"
            class="bg-main text-white mt-4 px-4 py-2 rounded-xl"
            :class="{ 'btn-disabled': !file }"
            :disabled="!file"
        >
            Upload
        </button>
        <button
            v-else
            class="bg-slate-500 text-white mt-4 px-4 py-2 rounded-xl flex items-center justify-center"
        >
            Uploading &nbsp;
            <l-ring
                size="20"
                stroke="3"
                bg-opacity="0"
                speed="1.5"
                color="white"
            ></l-ring>
        </button>

        <template v-if="auth.user && !isUploading">
            <button
                @click="showLibrary = !showLibrary"
                class="bg-white text-main mt-2 px-4 py-2 rounded-xl border-2 border-gray-200"
            >
                {{ showLibrary ? "Hide my saved files" : "Choose from my saved files" }}
            </button>
            <div v-if="showLibrary" class="mt-2 border-2 border-gray-100 rounded-xl p-2 max-h-48 overflow-y-auto">
                <p v-if="loadingLibrary" class="text-sm text-gray-500 p-2">Loading…</p>
                <p v-else-if="library.length === 0" class="text-sm text-gray-500 p-2">
                    No saved files yet. Files you upload while logged in are kept here.
                </p>
                <div
                    v-for="f in library"
                    :key="f.id"
                    class="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg gap-2"
                >
                    <span class="truncate">{{ f.name }}</span>
                    <button @click="useLibraryFile(f.id)" class="text-blue-600 hover:underline shrink-0">
                        Use
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import axios from "axios";
import { useToast } from "vue-toastification";
import { ring } from "ldrs";
import { useAuthStore } from "../stores/authStore";

interface LibraryFile {
    id: string;
    name: string;
}

const file = ref<File | null>(null);
const toast = useToast();
const emit = defineEmits(["fileUploaded"]);
const auth = useAuthStore();

const isUploading = ref(false);
const showLibrary = ref(false);
const library = ref<LibraryFile[]>([]);
const loadingLibrary = ref(false);
ring.register();

watch(showLibrary, (open) => {
    if (open && auth.user) void loadLibrary();
});

async function loadLibrary() {
    loadingLibrary.value = true;
    try {
        const token = await auth.getIdToken();
        const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/my-files`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        library.value = response.data.files ?? [];
    } catch (error) {
        console.error("Error loading saved files:", error);
        toast.error("Could not load saved files.");
    } finally {
        loadingLibrary.value = false;
    }
}

async function useLibraryFile(id: string) {
    try {
        const token = await auth.getIdToken();
        const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/my-files/${id}/download`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        emit("fileUploaded", response.data.fileUrl);
        toast.success("File attached!");
        showLibrary.value = false;
    } catch (error) {
        console.error("Error attaching saved file:", error);
        toast.error("Could not attach that file.");
    }
}

function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
        file.value = input.files[0];
    }
}

async function submitFile() {
    isUploading.value = true;
    if (!file.value) return;

    const formData = new FormData();
    formData.append("file", file.value);
    formData.append("name", file.value.name);

    try {
        const token = auth.user ? await auth.getIdToken() : null;
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            }
        );

        console.log(response.data.message);
        // Emit the fileUrl to the parent component
        emit("fileUploaded", response.data.fileUrl);
        toast.success("File uploaded!");
        // Clear the file after upload
        file.value = null;
    } catch (error) {
        console.error("Error uploading file:", error);
        const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
        toast.error(message || "Error uploading file. Please try again.");
    }
    isUploading.value = false;
}
</script>

<style scoped>
.text-white {
    color: white;
}

.btn-disabled {
    background-color: #d6d6d6;
    opacity: 0.8;
}
</style>
