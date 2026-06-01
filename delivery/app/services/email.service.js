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

function buildMerchantReportHtml(username, report) {
  const difference = (Number(report.totalPrice) || 0) - (Number(report.salary) || 0);

  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin-bottom: 8px;">Хүргэлтийн тайлан</h2>
      <p style="margin-top: 0;">Сайн байна уу, <strong>${username}</strong>,</p>
      <p>Доорх тайланг илгээлээ (<strong>${report.dateRange}</strong>).</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 640px; margin-top: 16px;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Нийт хүргэлт</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${report.totalDeliveries}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Хүргэсэн хүргэлт</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${report.deliveredDeliveries}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Хаягаар очсон</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${report.status5Deliveries}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Захиалгын тоо</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${report.orderCount || 0}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Нийт тооцоо</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatMoney(report.totalPrice)} ₮</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Цалин</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatMoney(report.salary)} ₮</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Зөрүү</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatMoney(difference)} ₮</td>
        </tr>
      </table>
      <p style="margin-top: 24px; color: #666; font-size: 12px;">UB Express</p>
    </div>
  `;
}

function buildMerchantReportText(username, report) {
  const difference = (Number(report.totalPrice) || 0) - (Number(report.salary) || 0);
  return [
    `Хүргэлтийн тайлан — ${username}`,
    `Огноо: ${report.dateRange}`,
    `Нийт хүргэлт: ${report.totalDeliveries}`,
    `Хүргэсэн: ${report.deliveredDeliveries}`,
    `Хаягаар очсон: ${report.status5Deliveries}`,
    `Захиалгын тоо: ${report.orderCount || 0}`,
    `Нийт тооцоо: ${formatMoney(report.totalPrice)} ₮`,
    `Цалин: ${formatMoney(report.salary)} ₮`,
    `Зөрүү: ${formatMoney(difference)} ₮`,
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
