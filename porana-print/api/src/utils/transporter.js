import axios from "axios";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { config } from "../config.js";

const stripe = new Stripe(config.stripeKey);
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: config.mailerUsername,
    pass: config.mailerPassword,
  },
});

const sendSlackWebhook = async (message) => {
  try {
    await axios.post(config.slackWebhookUrl, { text: message });
  } catch (error) {
    console.error("Error sending Slack webhook:", error);
  }
};

export async function sendOrderConfirmation(
  session,
  items,
  pdfBuffer,
  orderNumber,
) {
  const formattedItemsHTML = items
    .map(
      (item, index) => `
    <li>
        <strong>Item ${index + 1}:</strong><br>
        <strong>Description:</strong> ${item.description}<br>
        <strong>Options:</strong> ${item.options}<br>
        <strong>Quantity:</strong> ${item.quantity}<br>
        <strong>Price:</strong> $${(item.amount_total / 100).toFixed(2)}<br>
        ${
          item.fileUrl
            ? `<strong>Download File:</strong> <a href="${item.fileUrl}" target="_blank">Click here to download</a><br>`
            : ""
        }
        ${
          item.message
            ? `<strong>Message:</strong> ${item.message}<br>`
            : ""
        }
    </li>
    `,
    )
    .join("");

  // All file download links listed separately so every file is visible
  // regardless of email client attachment display limits.
  const allFileLinksHTML = items
    .filter((item) => item.fileUrl)
    .map(
      (item, index) => `
    <li>
      <strong>File ${index + 1}:</strong> <a href="${item.fileUrl}" target="_blank">Download File</a>
      ${item.message ? ` — Message: ${item.message}` : ""}
    </li>
    `,
    )
    .join("");

  const shippingRate = await stripe.shippingRates.retrieve(
    session.shipping_cost.shipping_rate,
  );

  const mailOptions = {
    from: `Porana Print <${config.mailerUsername}>`,
    to: `${session.customer_details.email}`,
    subject: "Order Confirmation - Porana Print",
    html: `
      <p>Thank you for your order, ${session.customer_details.name}!</p>
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Shipping Address:</strong><br />
        ${session.shipping_details.address.line1}<br />
        ${
          session.shipping_details.address.line2
            ? session.shipping_details.address.line2 + "<br />"
            : ""
        }
        ${session.shipping_details.address.city}<br />
        ${session.shipping_details.address.postal_code}<br />
        ${session.shipping_details.address.country}
        </p>
        <p><strong>Shipping Method:</strong> ${
          shippingRate.display_name
        }<br /><strong>Shipping Amount:</strong> $${(
          session.shipping_cost.amount_total / 100
        ).toFixed(2)}<br /><strong>Total Amount:</strong> $${(
          session.amount_total / 100
        ).toFixed(
          2,
        )}<br /><strong>${session.payment_status.toUpperCase()} - ${session.status.toUpperCase()}</strong></p>

      <p>Your order includes:</p>
      <ul>${formattedItemsHTML}</ul>

      ${
        allFileLinksHTML
          ? `
      <h3>📎 Files to Download</h3>
      <p>Please download all your uploaded files below:</p>
      <ul>${allFileLinksHTML}</ul>
      `
          : ""
      }

      <p>We appreciate your business!</p>
      <p>Regards,<br>Porana Print</p>
    `,
    attachments: [
      {
        filename: "invoice.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent successfully");
  } catch (error) {
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "Error sending order confirmation email",
        error: error.message,
        stack: error.stack,
      }),
    );
  }
}

export async function sendOrderNotification(
  session,
  items,
  pdfBuffer,
  orderNumber,
) {
  // Format items as HTML
  const formattedItems = items
    .map(
      (item, index) => `
        <li>
            <strong>Item ${index + 1}:</strong><br>
            <strong>Description:</strong> ${item.description}<br>
            <strong>Options:</strong> ${item.options || "N/A"}<br>
            <strong>Quantity:</strong> ${item.quantity}<br>
            <strong>Price:</strong> $${(item.amount_total / 100).toFixed(2)}<br>
            ${
              item.fileUrl
                ? `<strong>Download File:</strong> <a href="${item.fileUrl}" target="_blank">Click here to download</a><br>`
                : ""
            }
            ${
              item.message
                ? `<strong>Message:</strong> ${item.message}<br>`
                : ""
        }
        </li>`,
    )
    .join("");

  // All file download links listed separately so every file is visible
  const allFileLinks = items
    .filter((item) => item.fileUrl)
    .map(
      (item, index) => `
    <li>
      <strong>File ${index + 1}:</strong> <a href="${item.fileUrl}" target="_blank">Download File</a>
      ${item.message ? ` — Message: ${item.message}` : ""}
    </li>
    `,
    )
    .join("");

  const shippingRate = await stripe.shippingRates.retrieve(
    session.shipping_cost.shipping_rate,
  );

  const mailOptions = {
    from: `Print Order <${config.mailerUsername}>`,
    to: config.mailerUsername,
    subject: `New Order - Porana Print (#${orderNumber})`,
    html: `
      <p>A new order has been placed:</p>
      
      <p><strong>Customer Name:</strong> ${
        session.customer_details.name
      }<br /><strong>Customer Email:</strong> ${
        session.customer_details.email
      }<br /><strong>Customer Phone:</strong> ${
        session.customer_details.phone
      }</p>

      <p><strong>Order Number:</strong> ${orderNumber}</p>

      <p><strong>Shipping Details:</strong><br />
      ${session.shipping_details.name}<br />
        ${session.shipping_details.address.line1}<br />
        ${
          session.shipping_details.address.line2
            ? session.shipping_details.address.line2 + "<br />"
            : ""
        }
        ${session.shipping_details.address.city}<br />
        ${session.shipping_details.address.postal_code} 
        ${session.shipping_details.address.country}
        </p>
        <p><strong>Shipping Method:</strong> ${
          shippingRate.display_name
        }<br /><strong>Shipping Amount:</strong> $${(
          session.shipping_cost.amount_total / 100
        ).toFixed(2)}<br /><strong>Total Amount:</strong> $${(
          session.amount_total / 100
        ).toFixed(
          2,
        )}<br /><strong>${session.payment_status.toUpperCase()} - ${session.status.toUpperCase()}</strong></p>
      
      <p><strong>Order details:</strong></p>
      <ul>
        ${formattedItems}
      </ul>

      ${
        allFileLinks
          ? `
      <h3>📎 Files to Download</h3>
      <p>Please download all customer-uploaded files below:</p>
      <ul>${allFileLinks}</ul>
      `
          : ""
      }

      <p>Please process the order.</p>
    `,
    attachments: [
      {
        filename: "invoice.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    await sendSlackWebhook(
      `New Order Notification - Porana Print (#${orderNumber})\nCustomer: ${session.customer_details.name}\nEmail: ${session.customer_details.email}\nTotal Amount: $${(session.amount_total / 100).toFixed(2)}`,
    );
    console.log("Order notification email sent successfully");
  } catch (error) {
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "Error sending order notification email",
        error: error.message,
        stack: error.stack,
      }),
    );
  }
}

export async function sendInquiryNotification(request) {
  const { name, email, phone, details, subject } = request;

  const mailOptions = {
    from: config.mailerUsername,
    to: config.mailerUsername,
    subject: `${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nDetails: ${details}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    await sendSlackWebhook(
      `${subject}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nDetails: ${details}\n`,
    );
  } catch (error) {
    console.error("Error in sendInquiryNotification:", error);
    throw error;
  }
}
