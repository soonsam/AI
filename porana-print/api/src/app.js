import { Storage } from "@google-cloud/storage";
import axios from "axios";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";
import multer from "multer";
import path from "node:path";
import PDFDocument from "pdfkit";
import Stripe from "stripe";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { admin, db } from "./database/firebase.js";
import { buildInvoicePDF, generatePDF } from "./utils/generatePDF.js";
import {
  sendInquiryNotification,
  sendOrderConfirmation,
  sendOrderNotification,
} from "./utils/transporter.js";

const app = express();
// Behind Cloud Run's proxy: trust one hop so req.ip is the client IP for rate limiting
app.set("trust proxy", 1);
app.use(
  cors({
    origin: ["https://www.poranaprint.co.nz", config.hostUrl],
  }),
);
app.use(express.json());

const stripe = new Stripe(config.stripeKey);
const storage = new Storage({
  projectId: config.gcpId,
  // keyFilename: config.gcpPath,
  credentials: JSON.parse(config.gcpPath),
});

// Content-based allowlist: key = MIME type detected from the file bytes,
// value = extension used when writing to storage.
const ALLOWED_MIME_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 20, // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many upload attempts. Please try again later." },
});

// resolve product IDs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, config.productIds)),
);

// Function to upload file to Google Cloud Storage
const uploadFileToGCS = async (
  bucketName,
  fileBuffer,
  destinationFileName,
  mimeType,
) => {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destinationFileName);

  await file.save(fileBuffer, {
    contentType: mimeType,
  });

  const [url] = await file.getSignedUrl(signedUrlOptions());

  return url; // Return the signed URL
};

// Fresh 7-day read links are minted on demand, so stored files never rely
// on an old URL. The objects themselves stay in the bucket indefinitely.
const signedUrlOptions = () => ({
  version: "v4",
  action: "read",
  expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  responseDisposition: "inline", // Ensure the file opens in the browser
});

const addOrderDoc = async (order) => {
  const counterRef = db.collection("counters").doc("orders");
  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    let lastOrderNumber = doc.exists ? doc.data().lastOrderNumber : 10000;
    const newOrderNumber = lastOrderNumber + 1;
    transaction.set(counterRef, { lastOrderNumber: newOrderNumber });

    await db
      .collection("orders")
      .doc()
      .set({ ...order, orderNumber: newOrderNumber });
    console.log("Order Number:", newOrderNumber);
    return newOrderNumber;
  });
};

const notifyError = async (error) => {
  try {
    await axios.post(config.errorWebhookUrl, {
      text: `🚨 *Server Error* 🚨\n*Message*: ${error.message || "Unknown error"}\n*Stack Trace*: ${error.stack || "No stack trace available"}`,
    });
  } catch (notificationError) {
    console.error(
      "Failed to send error notification:",
      notificationError.message,
    );
  }
};

// FIRESTORE ENDPOINTS
app.post("/add-item", async (req, res) => {
  const { cartId, item, uid } = req.body;
  const cartsCollection = db.collection("carts");
  try {
    // create new cart if no existing cart
    if (!cartId) {
      const newCartId = uuidv4();
      const newCart = cartsCollection.doc(newCartId);
      await newCart.set({
        items: [item],
        uid: uid || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return res.status(201).json({
        cartId: newCartId,
        message: "Cart created and item added",
      });
    }

    // Cart exists; update the existing cart
    const cart = cartsCollection.doc(cartId);
    const cartDoc = await cart.get();

    if (!cartDoc.exists) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartData = cartDoc.data();
    const updatedItems = [...cartData.items, item];
    await cart.update({
      items: updatedItems,
      // Link the cart to a logged-in user when provided; never wipe it.
      ...(uid ? { uid } : {}),
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ message: "Item added to existing cart" });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return res.status(500).json({ message: "Error adding item to cart" });
  }
});

app.get("/cart", async (req, res) => {
  const { cartId } = req.query;

  try {
    // Validate the `cartId`
    if (!cartId) {
      return res.status(400).json({ message: "Cart ID is required" });
    }

    // Fetch the cart from Firestore
    const cartRef = db.collection("carts").doc(cartId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartData = cartDoc.data();
    const items = cartData.items || [];

    // Fetch detailed product information from Stripe
    const cartItems = await Promise.all(
      items.map(async (item) => {
        const stripeProductId = productMapping[item.id];
        try {
          // Use Stripe's API to retrieve product details
          const product = await stripe.products.retrieve(stripeProductId);
          const price = await stripe.prices.retrieve(product.default_price);

          // Return cart item details
          return {
            id: item.id,
            uid: item.uid,
            name: product.name,
            description: product.description,
            image: product.images[0], // First image from Stripe
            options: item.options,
            fileUrl: item.fileUrl,
            quantity: item.quantity,
            message: item.message,
            price: price.unit_amount / 100, // Stripe price is in cents
            totalPrice: (price.unit_amount / 100) * item.quantity,
            specialInstructions: item.specialInstructions || "",
          };
        } catch (err) {
          console.error(`Error fetching product for ID: ${item.id}`, err);
          return null; // Skip invalid items
        }
      }),
    );

    // Calculate the total price of the cart
    const totalCartPrice = cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    console.log(cartItems);

    return res.status(200).json({ cartItems: cartItems, totalCartPrice });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/remove-item", async (req, res) => {
  const { cartId, itemId } = req.query;

  if (!cartId || !itemId) {
    return res.status(400).json({ message: "cartId and itemId are required" });
  }

  try {
    const cartRef = db.collection("carts").doc(cartId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Get the current items in the cart
    const cartData = cartDoc.data();
    const items = cartData.items || [];

    const updatedItems = items.filter((item) => item.uid !== itemId);

    await cartRef.update({ items: updatedItems });

    return res.status(200).json({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Express route to handle file upload
app.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Validate by actual content, not the client-supplied mimetype
    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected || !ALLOWED_MIME_TYPES[detected.mime]) {
      return res
        .status(400)
        .json({ message: "Only PDF, JPG, and PNG files are allowed" });
    }

    // Server-generated filename — never persist the client-supplied originalname
    const extension = ALLOWED_MIME_TYPES[detected.mime];

    // Optional auth: logged-in users get the file linked to their account
    // under their own prefix. Guests keep the existing shared behaviour.
    let ownerUid = null;
    try {
      const header = req.headers.authorization ?? "";
      const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (idToken) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        ownerUid = decoded.uid;
      }
    } catch {
      ownerUid = null;
    }

    const destinationFileName = ownerUid
      ? `users/${ownerUid}/${uuidv4()}.${extension}`
      : `uploads/${uuidv4()}.${extension}`;

    const bucketName = "porana-print";
    const url = await uploadFileToGCS(
      bucketName,
      file.buffer,
      destinationFileName,
      detected.mime,
    );

    let fileId = null;
    if (ownerUid) {
      const metaRef = await db.collection("userFiles").add({
        uid: ownerUid,
        name: String(req.body.name || destinationFileName).slice(0, 200),
        size: file.size,
        mime: detected.mime,
        gcsPath: destinationFileName,
        uploadedAt: new Date().toISOString(),
        usedInOrderIds: [],
      });
      fileId = metaRef.id;
    }

    return res.status(200).send({
      message: "File uploaded successfully!",
      fileUrl: url,
      fileId,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    // Don't leak internal error details to the client
    return res.status(500).send({ message: "Error uploading file" });
  }
});

// get the price of product
app.get("/products/get-price", async (req, res) => {
  try {
    const product = await stripe.products.retrieve(
      productMapping[req.query.id],
    );
    const price = await stripe.prices.retrieve(product.default_price);

    res.json(price.unit_amount / 100);
  } catch (error) {
    console.error("Error retrieving product price:", error);
    res.status(500).json({ message: "Error retrieving product price" });
  }
});

// get the price of shipping
app.get("/shipping/get-price", async (req, res) => {
  try {
    const shippingRate = await stripe.shippingRates.retrieve(req.query.id);
    const price = shippingRate.fixed_amount.amount / 100;

    res.json(price);
  } catch (error) {
    console.error("Error retrieving shipping price:", error);
    res.status(500).json({ message: "Error retrieving shipping price" });
  }
});

// Define the endpoint to get the shipping options
app.get("/api/shipping-options", (req, res) => {
  const shippingOptions = [
    { id: "shr_1QBP2WGB5LZAemm9uTtzotZc", label: "Pick Up" },
    { id: "shr_1TlT0WGB5LZAemm9OYVHBqp9", label: "Auckland" },
    { id: "shr_1TlT2UGB5LZAemm9sdDUXJAM", label: "Auckland (Rural)" },
    { id: "shr_1TlT5gGB5LZAemm9hbOzTyPo", label: "North Island" },
    { id: "shr_1TlT7HGB5LZAemm9nGWEbdgc", label: "North Island (Rural)" },
    { id: "shr_1QBRToGB5LZAemm9OslOlDev", label: "South Island" },
    { id: "shr_1TlTBQGB5LZAemm96K4uaCgI", label: "South Island (Rural)" },
  ];

  res.json(shippingOptions);
});

// Stripe checkout session endpoint
app.post("/create-checkout-session", async (req, res) => {
  const shipping = req.query.shipping;

  const cartId = req.query.cart_id;

  const totalPrice = req.body.totalPrice;

  const cartRef = db.collection("carts").doc(cartId);
  const cartDoc = await cartRef.get();

  if (!cartDoc.exists) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const cartData = cartDoc.data();
  const cartItems = cartData.items || [];

  const line_items = await Promise.all(
    cartItems.map(async (item) => {
      const stripeProductId = productMapping[item.id];

      if (!stripeProductId) {
        throw new Error(
          `No Stripe product ID found for product_id: ${item.id}`,
        );
      }

      try {
        const stripeProduct = await stripe.products.retrieve(stripeProductId);
        const price_id = stripeProduct.default_price;
        const quantity = Math.floor(item.quantity);

        if (!price_id) {
          throw new Error(`No price_id found for product_id: ${item.id}`);
        }

        return {
          price: price_id,
          quantity: quantity,
        };
      } catch (error) {
        console.error(
          `Error retrieving product for product_id: ${item.id}`,
          error,
        );
        throw error;
      }
    }),
  );

  if (totalPrice < 2) {
    const difference = Math.ceil((2 - totalPrice) * 100);
    line_items.push({
      price_data: {
        currency: "nzd",
        product_data: {
          name: "Minimum Charge Fee",
          description:
            "This fee ensures a minimum charge of $2 for your order.",
        },
        unit_amount: difference,
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: line_items,
      mode: "payment",
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${config.hostUrl}/success?session_id={CHECKOUT_SESSION_ID}&cart_id=${cartId}&success=true`,
      cancel_url: `${config.hostUrl}/cart?cancelled=true`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["NZ"],
      },
      shipping_options: [
        {
          shipping_rate: shipping,
          // shipping_rate: "shr_1PwyO0GB5LZAemm9kjNh65jZ",
        },
      ],
      phone_number_collection: {
        enabled: true,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).send(`Error creating checkout session: ${error.message}`);
  }
});

// return order details on checkout success
app.post("/checkout-success", async (req, res) => {
  const { sessionId, cartId } = req.body;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const items = await stripe.checkout.sessions.listLineItems(sessionId);

    const cartRef = db.collection("carts").doc(cartId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartData = cartDoc.data();
    const cartItems = cartData.items || [];

    console.log("cart items", cartItems);

    // Attach options, file URLs, and messages to items
    const fullItems = items.data.map((item, index) => ({
      ...item,
      options: cartItems[index]?.options || "",
      fileUrl: cartItems[index]?.fileUrl || "",
      message: cartItems[index]?.message || "",
    }));

    const sessionDetails = {
      customerName: session.customer_details.name,
      customerEmail: session.customer_details.email,
      totalAmount: session.amount_total / 100,
      currency: session.currency,
      items: fullItems,
      // Logical cart items (our product IDs) for reorders + owner lookup.
      sourceItems: cartItems,
      uid: cartData.uid || null,
      createdAt: new Date().toISOString(),
      // Self-contained snapshot for invoice reprints (no live Stripe fetch).
      invoice: {
        name: session.customer_details.name,
        email: session.customer_details.email,
        phone: session.customer_details.phone,
        address: {
          line1: session.shipping_details?.address?.line1 || "",
          line2: session.shipping_details?.address?.line2 || "",
          city: session.shipping_details?.address?.city || "",
          postalCode: session.shipping_details?.address?.postal_code || "",
        },
        subtotal: session.amount_subtotal / 100,
        shipping: session.shipping_cost?.amount_total / 100 ?? 0,
        tax: session.total_details?.amount_tax / 100 ?? 0,
        total: session.amount_total / 100,
        currency: session.currency,
        paymentMethod: session.payment_method_types?.[0] || "",
        created: session.created,
      },
    };

    console.log("session details", sessionDetails);

    const pdfDoc = new PDFDocument();
    const buffers = [];

    const orderNumber =
      (await addOrderDoc({
        ...sessionDetails,
      })) || "";

    console.log("READOrder Number:", orderNumber);

    pdfDoc.on("data", buffers.push.bind(buffers));
    pdfDoc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Send order confirmation and new order notification with the PDF
      await Promise.all([
        sendOrderConfirmation(session, fullItems, pdfBuffer, orderNumber),
        sendOrderNotification(session, fullItems, pdfBuffer, orderNumber),
      ]);
    });

    // Fill the PDF with invoice data
    generatePDF(pdfDoc, session, items.data, orderNumber);

    pdfDoc.end();

    res.json({ sessionDetails, cartItems });
    return;
  } catch (error) {
    await notifyError(error);
    res.status(500).json({ error: error.message });
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "Error processing checkout success",
        error: error.message,
        stack: error.stack,
      }),
    );
  }
});

/**
 * Endpoint to handle inquiry requests.
 * @route POST /send-inquiry
 */
app.post("/send-inquiry", async (req, res) => {
  try {
    sendInquiryNotification(req.body);
    return res
      .status(200)
      .send({ message: "Inquiry request sent successfully" });
  } catch (error) {
    await notifyError(error);
    console.error("Error sending inquiry request:", error);
    return res.status(500).send({ message: "Error sending inquiry request" });
  }
});

// Link a Firebase Auth user to a Firestore user doc (idempotent).
// The frontend calls this right after login/register with a fresh ID token.
app.post("/auth/sync", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const ref = db.collection("users").doc(decoded.uid);
    const snap = await ref.get();
    const now = new Date();
    if (!snap.exists) {
      await ref.set({
        email: decoded.email ?? "",
        name: decoded.name ?? "",
        createdAt: now,
        lastLoginAt: now,
      });
    } else {
      await ref.update({ lastLoginAt: now });
    }
    return res
      .status(200)
      .send({ uid: decoded.uid, email: decoded.email ?? "" });
  } catch (error) {
    console.error("Error syncing user:", error);
    return res.status(401).send({ message: "Invalid ID token" });
  }
});

// Return the signed-in user's own orders (newest first).
// Sorted in code to avoid requiring a Firestore composite index.
app.get("/my-orders", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const snap = await db
      .collection("orders")
      .where("uid", "==", decoded.uid)
      .limit(50)
      .get();
    const orders = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
    return res.status(200).send({ orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(401).send({ message: "Invalid ID token" });
  }
});

// List the signed-in user's saved design files (metadata only;
// fresh download links are minted per file on demand).
app.get("/my-files", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const snap = await db
      .collection("userFiles")
      .where("uid", "==", decoded.uid)
      .limit(100)
      .get();
    const files = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          size: d.size,
          mime: d.mime,
          uploadedAt: d.uploadedAt,
        };
      })
      .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    return res.status(200).send({ files });
  } catch (error) {
    console.error("Error fetching user files:", error);
    return res.status(401).send({ message: "Invalid ID token" });
  }
});

// Mint a fresh download link for one of the user's own files.
app.get("/my-files/:id/download", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const doc = await db.collection("userFiles").doc(req.params.id).get();
    if (!doc.exists || doc.data().uid !== decoded.uid) {
      return res.status(404).send({ message: "File not found" });
    }
    const file = storage
      .bucket("porana-print")
      .file(doc.data().gcsPath);
    const [url] = await file.getSignedUrl(signedUrlOptions());
    return res.status(200).send({ fileUrl: url, name: doc.data().name });
  } catch (error) {
    console.error("Error generating download link:", error);
    return res.status(500).send({ message: "Error generating download link" });
  }
});

// Delete one of the user's own files (object + metadata).
app.delete("/my-files/:id", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const ref = db.collection("userFiles").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().uid !== decoded.uid) {
      return res.status(404).send({ message: "File not found" });
    }
    try {
      await storage.bucket("porana-print").file(doc.data().gcsPath).delete();
    } catch (e) {
      console.warn("GCS object already gone:", doc.data().gcsPath);
    }
    await ref.delete();
    return res.status(200).send({ message: "File deleted" });
  } catch (error) {
    console.error("Error deleting user file:", error);
    return res.status(500).send({ message: "Error deleting file" });
  }
});

// Reprint an invoice for one of the user's own orders as a PDF download.
app.get("/my-orders/:id/invoice", async (req, res) => {
  try {
    const header = req.headers.authorization ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return res.status(401).send({ message: "Missing ID token" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const doc = await db.collection("orders").doc(req.params.id).get();
    if (!doc.exists || doc.data().uid !== decoded.uid) {
      return res.status(404).send({ message: "Order not found" });
    }
    const order = { id: doc.id, ...doc.data() };
    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${order.orderNumber || order.id}.pdf"`
    );
    pdfDoc.pipe(res);
    buildInvoicePDF(pdfDoc, order);
    pdfDoc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).send({ message: "Error generating invoice" });
  }
});

// Handle multer errors (e.g. file size limit)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
    }
    return res.status(400).json({ message: "File upload error" });
  }
  next(err);
});

app.listen(config.port, () => {
  console.log(`Express server listening on port ${config.port}`);
});
