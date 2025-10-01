import { PurchaseInvoice } from "../../types/types";
import { formatDateTime, safeToFixed } from "../../types/utils";

export const PrintLayout = (
  invoice: PurchaseInvoice,
  currentUser: { id: string; name: string } | null
): string => {
  try {
    // Sanitize invoice data
    const safeData = JSON.parse(JSON.stringify(invoice));
    const itemsTotal = safeData.items?.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity),
      0
    ) || 0;
    const paidAmount = safeData.amount_paid || itemsTotal || 0;
    const remaining = itemsTotal - paidAmount;
    const tolerance = 0.01;
    const paymentStatus =
      paidAmount >= itemsTotal - tolerance
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "unpaid";

    const formattedDate = safeData.created_at
      ? new Date(safeData.created_at).toLocaleDateString("en-CA")
      : new Date().toLocaleDateString("en-CA");
    const formattedTime = safeData.created_at
      ? new Date(safeData.created_at).toLocaleTimeString("en-EG", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("فشل فتح نافذة الطباعة: من المحتمل أن تكون النوافذ المنبثقة محظورة");
      alert(
        "فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مرة أخرى."
      );
      return;
    }

    const printContent = `
      <html dir="rtl">
      <head>
        <title>فاتورة مشتريات ${safeData.invoice_number || "غير معروف"}</title>
        <meta charset="UTF-8">
       <script src="/libs/JsBarcode.all.min.js"></script>
        <style>
          * {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 80mm;
            margin: 0 auto;
            padding: 2mm;
            color: #000;
            font-size: 12px;
            line-height: 1.3;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
            padding-bottom: 5px;
            border-bottom: 1px dashed #000;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .invoice-title {
            font-size: 14px;
            margin: 3px 0;
          }
          .invoice-number {
            font-size: 13px;
            font-weight: bold;
            background: #f0f0f0;
            padding: 2px 5px;
            display: inline-block;
            border-radius: 3px;
          }
          .info {
            margin: 8px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
          }
          .info-label {
            font-weight: bold;
            min-width: 60px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 11px;
          }
          th, td {
            padding: 4px 2px;
            text-align: right;
            border-bottom: 1px solid #ddd;
          }
          th {
            font-weight: bold;
            border-bottom: 2px solid #000;
          }
          .total-row {
            font-weight: bold;
            border-top: 2px solid #000;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            ${
              paymentStatus === "paid"
                ? "background: #e6f7e6; color: #0a5c0a;"
                : paymentStatus === "partial"
                ? "background: #fff3cd; color: #856404;"
                : "background: #f8d7da; color: #721c24;"
            }
          }
          .method-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            background: #f0f0f0;
            font-size: 10px;
          }
          .totals-box {
            border: 1px solid #000;
            padding: 8px;
            margin-top: 8px;
            font-size: 12px;
          }
          .total-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .total-value {
            font-weight: bold;
          }
          .notes {
            margin-top: 8px;
            padding: 5px;
            border: 1px dashed #aaa;
            font-size: 11px;
            background: #f9f9f9;
          }
          .barcode-container {
            text-align: center;
            margin: 8px 0;
          }
          .barcode-container img,
          .barcode-container canvas {
            max-width: 250px;
            height: auto;
          }
          .barcode-label {
            font-size: 10px;
            margin-top: 2px;
          }
          .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px dashed #aaa;
            padding-top: 5px;
          }
          @media print {
            @page {
              size: auto;
              margin: 0mm auto;
            }
            body {
              width: 80mm;
              margin: 0 auto;
              padding: 2mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">حلواني الحسن والحسين</div>
          <div class="invoice-title">فاتورة مشتريات</div>
        </div>
        <div class="info">
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span>${formattedDate} ${formattedTime}</span>
          </div>
          <div class="info-row">
            <span class="info-label">اسم المستلم:</span>
            <span>${safeData.cashier?.name || currentUser?.name || "غير معروف"}${
              safeData.cashier?.deleted_at ? " (محذوف)" : ""
            }</span>
          </div>
          <div class="info-row">
            <span class="info-label">اسم المورد:</span>
            <span>${safeData.supplier?.name || "غير محدد"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">هاتف المورد:</span>
            <span>${safeData.supplier?.phone || "غير محدد"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">حالة الدفع:</span>
            <span class="status-badge">
              ${
                paymentStatus === "paid"
                  ? "مدفوعة"
                  : paymentStatus === "partial"
                  ? "جزئي"
                  : "غير مدفوعة"
              }
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">عدد المنتجات:</span>
            <span>${safeData.items?.length || 0}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 40%">المنتج</th>
              <th style="width: 20%">السعر</th>
              <th style="width: 15%">الكمية</th>
              <th style="width: 20%">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${safeData.items
              ?.map(
                (item: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.product?.name || item.name || "منتج غير معروف"}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td style="text-align: center">${item.quantity}</td>
                <td>${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}</td>
              </tr>
            `
              )
              .join("") || ""}
            <tr class="total-row">
              <td colspan="2">المجموع</td>
              <td colspan="3" style="text-align: left">${itemsTotal.toFixed(2)} ج.م</td>
            </tr>
          </tbody>
        </table>
        <div class="totals-box">
          <div class="total-item">
            <span>إجمالي الفاتورة:</span>
            <span class="total-value">${itemsTotal.toFixed(2)} ج.م</span>
          </div>
          <div class="total-item">
            <span>المبلغ المدفوع:</span>
            <span class="total-value">${Number(paidAmount).toFixed(2)} ج.م</span>
          </div>
          <div class="total-item">
            <span>المبلغ المتبقي:</span>
            <span class="total-value">${remaining.toFixed(2)} ج.م</span>
          </div>
        </div>
        ${
          safeData.notes
            ? `
          <div class="notes">
            <strong>ملاحظات:</strong>
            <p>${safeData.notes}</p>
          </div>
        `
            : ""
        }
        <div class="barcode-container">
          <canvas id="barcode"></canvas>
          <div class="barcode-label">${safeData.invoice_number || "غير معروف"}</div>
        </div>
        <div class="footer">
          <div>شكراً لتعاملكم معنا</div>
          <div>هاتف: 01024456408 | ${new Date().getFullYear()} ©</div>
        </div>
        <script>
          try {
            JsBarcode("#barcode", "${safeData.invoice_number || 'غير معروف'}", {
              format: "CODE128",
              width: 2,
              height: 30,
              displayValue: false,
              margin: 5
            });
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          } catch (e) {
            console.error("خطأ أثناء إنشاء الباركود أو الطباعة:", e);
            alert("حدث خطأ أثناء إنشاء الباركود أو الطباعة. يرجى المحاولة مرة أخرى.");
            window.close();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Fallback to ensure the window closes
    setTimeout(() => {
      if (!printWindow.closed) {
        console.warn("نافذة الطباعة لم تغلق تلقائيًا، يتم إغلاقها الآن");
        printWindow.close();
      }
    }, 1000);
  } catch (error) {
    console.error("Error generating print layout:", error);
    alert("حدث خطأ أثناء إنشاء تخطيط الطباعة. يرجى المحاولة مرة أخرى.");
  }
};