const { Resend } = require("resend");

let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY in environment."
    );
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromAddress() {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM;
  if (!from) {
    throw new Error(
      "Email sender is not configured. Set RESEND_FROM (e.g. \"UB Express <reports@yourdomain.com>\")."
    );
  }
  return from;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReportDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function buildDeliveriesDetailHtml(deliveries) {
  if (!Array.isArray(deliveries) || deliveries.length === 0) {
    return `
      <p style="margin: 12px 0 0; color: #6b7280; font-size: 14px;">
        Энэ тайланд хамаарах хүргэлтийн мэдээлэл байхгүй.
      </p>
    `;
  }

  const rows = deliveries
    .map((delivery, index) => {
      const price = formatMoney(delivery.price);
      return `
        <tr>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px; text-align: center; color: #6b7280;">${index + 1}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px; white-space: nowrap;">${escapeHtml(formatReportDate(delivery.date))}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px;">${escapeHtml(delivery.address || "-")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px; white-space: nowrap;">${escapeHtml(delivery.phone || "-")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px;">${escapeHtml(delivery.status || "-")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px; white-space: nowrap;">${escapeHtml(delivery.driver || "-")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px 8px; text-align: right; white-space: nowrap; font-weight: 600;">${price} ₮</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin-top: 28px; overflow-x: auto;">
      <h3 style="margin: 0 0 4px; font-size: 16px; color: #111827;">Тайлангийн дэлгэрэнгүй</h3>
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">
        Тайланд багтсан ${deliveries.length} хүргэлтийн жагсаалт
      </p>
      <table style="border-collapse: collapse; width: 100%; min-width: 640px; font-size: 13px;">
        <thead>
          <tr>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: center; width: 36px;">№</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: left;">Огноо</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: left;">Хаяг</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: left;">Утас</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: left;">Төлөв</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: left;">Жолооч</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 8px; background: #f3f4f6; text-align: right;">Үнэ</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function buildDeliveriesDetailText(deliveries) {
  if (!Array.isArray(deliveries) || deliveries.length === 0) {
    return ["Тайлангийн дэлгэрэнгүй:", "  (хүргэлт байхгүй)"];
  }

  const lines = ["Тайлангийн дэлгэрэнгүй:"];
  deliveries.forEach((delivery, index) => {
    lines.push(
      `  ${index + 1}. ${formatReportDate(delivery.date)} | ${delivery.address || "-"} | ${delivery.phone || "-"} | ${delivery.status || "-"} | ${delivery.driver || "-"} | ${formatMoney(delivery.price)} ₮`
    );
  });
  return lines;
}

function buildSummaryRow(label, value, highlight) {
  const valueStyle = highlight
    ? "border: 1px solid #e5e7eb; padding: 12px 14px; text-align: right; font-weight: 700; font-size: 15px; color: #111827;"
    : "border: 1px solid #e5e7eb; padding: 12px 14px; text-align: right; color: #111827;";
  return `
    <tr>
      <td style="border: 1px solid #e5e7eb; padding: 12px 14px; background: #f9fafb; color: #374151; width: 45%;">${label}</td>
      <td style="${valueStyle}">${value}</td>
    </tr>
  `;
}

function buildMerchantReportHtml(username, report) {
  const difference = (Number(report.totalPrice) || 0) - (Number(report.salary) || 0);
  const safeUsername = escapeHtml(username);
  const safeDateRange = escapeHtml(report.dateRange);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111827; background: #f3f4f6; padding: 24px 12px;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #111827; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8;">UB Express</p>
          <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Хүргэлтийн тайлан</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 15px;">Сайн байна уу, <strong>${safeUsername}</strong>,</p>
          <p style="margin: 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.5;">
            <strong>${safeDateRange}</strong> хугацааны тайланг доор хавсаргалаа.
          </p>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #f9fafb; padding: 12px 14px; border-bottom: 1px solid #e5e7eb;">
              <strong style="font-size: 14px; color: #111827;">Тайлангийн хураангуй</strong>
            </div>
            <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
              ${buildSummaryRow("Нийт хүргэлт", report.totalDeliveries)}
              ${buildSummaryRow("Хүргэсэн хүргэлт", report.deliveredDeliveries)}
              ${buildSummaryRow("Хаягаар очсон", report.status5Deliveries)}
              ${buildSummaryRow("Захиалгын тоо", report.orderCount || 0)}
              ${buildSummaryRow("Нийт тооцоо", `${formatMoney(report.totalPrice)} ₮`)}
              ${buildSummaryRow("Цалин", `${formatMoney(report.salary)} ₮`)}
              ${buildSummaryRow("Зөрүү", `${formatMoney(difference)} ₮`, true)}
            </table>
          </div>
          ${buildDeliveriesDetailHtml(report.deliveries)}
        </div>
        <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          Энэ имэйлийг UB Express системээс автоматаар илгээсэн. Асуулт байвал бидэнтэй холбогдоно уу.
        </div>
      </div>
    </div>
  `;
}

function buildMerchantReportText(username, report) {
  const difference = (Number(report.totalPrice) || 0) - (Number(report.salary) || 0);
  return [
    `Хүргэлтийн тайлан — ${username}`,
    `Огноо: ${report.dateRange}`,
    "",
    "Тайлангийн хураангуй:",
    `Нийт хүргэлт: ${report.totalDeliveries}`,
    `Хүргэсэн: ${report.deliveredDeliveries}`,
    `Хаягаар очсон: ${report.status5Deliveries}`,
    `Захиалгын тоо: ${report.orderCount || 0}`,
    `Нийт тооцоо: ${formatMoney(report.totalPrice)} ₮`,
    `Цалин: ${formatMoney(report.salary)} ₮`,
    `Зөрүү: ${formatMoney(difference)} ₮`,
    "",
    ...buildDeliveriesDetailText(report.deliveries),
    "",
    "UB Express",
  ].join("\n");
}

async function sendMerchantReportEmail(toEmail, username, report) {
  const resend = getResend();
  const from = getFromAddress();

  const { data, error } = await resend.emails.send({
    from,
    to: [toEmail],
    subject: `Хүргэлтийн тайлан — ${username} (${report.dateRange})`,
    html: buildMerchantReportHtml(username, report),
    text: buildMerchantReportText(username, report),
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return data;
}

module.exports = {
  sendMerchantReportEmail,
};
