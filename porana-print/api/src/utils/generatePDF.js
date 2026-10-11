export function generatePDF(pdfDoc, session, items, orderNumber) {  // Add logo and details header
  pdfDoc
    .image("./src/images/logo-1.png", 50, 50, { width: 180 })
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("STATIONERY CITY", 360, 50, { align: "right" })
    .font("Helvetica")
    .fontSize(10)
    .text("2 Porana Road, Glenfield, Auckland 0627", 360, 65, {
      align: "right",
    })
    .text("GST number: 136-099-078", { align: "right" })
    .text("Tel: 09-443-5350", { align: "right" })
    .text("Email: info@stationerycity.co.nz", { align: "right" })
    .moveDown(2);

  // Customer details and invoice details
  pdfDoc
    .fontSize(11)
    .text("INVOICE", 50, 150) // Moved down for spacing
    .text(`${session.customer_details.name}`, 50, 170)
    .fontSize(11) // Adjust font size to 11 for address
    .text(`${session.shipping_details.address.line1}`, 50, 185)
    .text(`${session.shipping_details.address.line2}`, 50, 200)
    .text(
      `${session.shipping_details.address.city} ${session.shipping_details.address.postal_code}`,
      50,
      215,
    )
    .text(`${session.customer_details.email}`, 50, 230)
    .text(`${session.customer_details.phone}`, 50, 245);

  // Invoice details on the right
  pdfDoc
    .fontSize(11)
    // .text("Invoice Number: INV28374", 400, 170) // Moved down for spacing
    .text(`Invoice Date: ${new Date().toISOString().split("T")[0]}`, 400, 185)
    .text(`Order Number: ${orderNumber}`, 400, 200)
    .text(
      `Order Date: ${
        new Date(session.created * 1000).toISOString().split("T")[0]
      }`,
      400,
      215,
    )
    .text(`Payment Method: ${session.payment_method_types[0]}`, 400, 230)
    .moveDown(2);

  // Table headers
  pdfDoc
    .moveDown()
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Product", 50, 300)
    .text("Quantity", 350, 300)
    .text("Price", 470, 300)
    .moveDown();

  // Line below headers
  pdfDoc.moveTo(50, 320).lineTo(550, 320).stroke();

  // Table body - list of items
  let yPosition = 340;
  items.forEach((item) => {
    pdfDoc
      .fontSize(12)
      .font("Helvetica")
      .text(item.description, 50, yPosition)
      // .text(item.options, 50, yPosition + 15)
      .text(item.quantity, 370, yPosition)
      .text(`$${(item.amount_total / 100).toFixed(2)}`, 470, yPosition);

    yPosition += 20;
  });

  // Subtotal, Shipping, GST, Total
  yPosition += 20;
  pdfDoc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

  yPosition += 20;
  pdfDoc
    .font("Helvetica-Bold")
    .text("Subtotal:", 350, yPosition)
    .text(`$${(session.amount_subtotal / 100).toFixed(2)}`, 470, yPosition)
    .moveDown();

  yPosition += 15;
  pdfDoc
    .font("Helvetica-Bold")
    .text("Shipping:", 350, yPosition)
    .text(
      `$${(session.shipping_cost.amount_total / 100).toFixed(2)}`,
      470,
      yPosition,
    );

  yPosition += 15;
  pdfDoc
    .font("Helvetica-Bold")
    .text("GST (includes tax):", 350, yPosition)
    .text(
      `$${(session.total_details.amount_tax / 100).toFixed(2)}`,
      470,
      yPosition,
    );

  yPosition += 15;
  pdfDoc
    .font("Helvetica-Bold")
    .text("Total:", 350, yPosition)
    .text(`$${(session.amount_total / 100).toFixed(2)}`, 470, yPosition)
    .moveDown(2);

  // Add lines and finalize document structure
  pdfDoc
    .moveTo(50, yPosition + 25)
    .lineTo(550, yPosition + 25)
    .stroke();

  // Thank you message
  pdfDoc
    .font("Helvetica")
    .fontSize(12)
    .text("Thank you for shopping with us.", 90, yPosition + 50, {
      align: "center",
    })
    .text("Stationery City Glenfield", 90, yPosition + 65, {
      align: "center",
    })
    .text("www.stationerycity.co.nz", 90, yPosition + 80, {
      align: "center",
    });
}

// Reprint an invoice from a stored order document. Reads only the
// self-contained `invoice` snapshot (plus items/total fallbacks), so no
// live Stripe fetch is needed. Orders saved before the snapshot existed
// still print items + total; the subtotal/shipping/tax split is omitted.
export function buildInvoicePDF(pdfDoc, order) {
  const inv = order.invoice || {};
  const items = order.items || [];
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const orderDate = inv.created
    ? new Date(inv.created * 1000).toISOString().split("T")[0]
    : (order.createdAt || "").slice(0, 10);

  pdfDoc
    .image("./src/images/logo-1.png", 50, 50, { width: 180 })
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("STATIONERY CITY", 360, 50, { align: "right" })
    .font("Helvetica")
    .fontSize(10)
    .text("2 Porana Road, Glenfield, Auckland 0627", 360, 65, {
      align: "right",
    })
    .text("GST number: 136-099-078", { align: "right" })
    .text("Tel: 09-443-5350", { align: "right" })
    .text("Email: info@stationerycity.co.nz", { align: "right" })
    .moveDown(2);

  pdfDoc
    .fontSize(11)
    .text("INVOICE", 50, 150)
    .text(`${inv.name || order.customerName || ""}`, 50, 170)
    .fontSize(11)
    .text(`${inv.address?.line1 || ""}`, 50, 185)
    .text(`${inv.address?.line2 || ""}`, 50, 200)
    .text(
      `${inv.address?.city || ""} ${inv.address?.postalCode || ""}`.trim(),
      50,
      215,
    )
    .text(`${inv.email || order.customerEmail || ""}`, 50, 230)
    .text(`${inv.phone || ""}`, 50, 245);

  pdfDoc
    .fontSize(11)
    .text(`Invoice Date: ${new Date().toISOString().split("T")[0]}`, 400, 185)
    .text(`Order Number: ${order.orderNumber || ""}`, 400, 200)
    .text(`Order Date: ${orderDate}`, 400, 215)
    .text(`Payment Method: ${inv.paymentMethod || ""}`, 400, 230)
    .moveDown(2);

  pdfDoc
    .moveDown()
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Product", 50, 300)
    .text("Quantity", 350, 300)
    .text("Price", 470, 300)
    .moveDown();

  pdfDoc.moveTo(50, 320).lineTo(550, 320).stroke();

  let yPosition = 340;
  items.forEach((item) => {
    pdfDoc
      .fontSize(12)
      .font("Helvetica")
      .text(item.description || "", 50, yPosition)
      .text(item.quantity ?? "", 370, yPosition)
      .text(money((item.amount_total || 0) / 100), 470, yPosition);

    yPosition += 20;
  });

  yPosition += 20;
  pdfDoc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

  yPosition += 20;
  pdfDoc
    .font("Helvetica-Bold")
    .text("Total:", 350, yPosition)
    .text(money(inv.total ?? order.totalAmount), 470, yPosition)
    .moveDown();

  if (inv.subtotal != null) {
    // Detailed split only for orders saved with an invoice snapshot.
    const rows = [
      ["Subtotal:", inv.subtotal],
      ["Shipping:", inv.shipping],
      ["GST (includes tax):", inv.tax],
    ];
    yPosition += 15;
    for (const [label, value] of rows) {
      yPosition += 15;
      pdfDoc
        .font("Helvetica-Bold")
        .text(label, 350, yPosition)
        .text(money(value), 470, yPosition);
    }
  }

  pdfDoc
    .moveTo(50, yPosition + 25)
    .lineTo(550, yPosition + 25)
    .stroke();

  pdfDoc
    .font("Helvetica")
    .fontSize(12)
    .text("Thank you for shopping with us.", 90, yPosition + 50, {
      align: "center",
    })
    .text("Stationery City Glenfield", 90, yPosition + 65, {
      align: "center",
    })
    .text("www.stationerycity.co.nz", 90, yPosition + 80, {
      align: "center",
    });
}
