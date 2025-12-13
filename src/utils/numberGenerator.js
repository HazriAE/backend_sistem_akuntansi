import { Sales } from "../models/salesSchema.js";
import { Purchase } from "../models/PurchaseSchema.js";
/**
 * Generate invoice number for sales
 * Format: INV-YYYYMM-XXX
 * Example: INV-202412-001
 */
export const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  // Find last invoice with same prefix
  const lastInvoice = await Sales.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (lastInvoice) {
    const lastNumber = lastInvoice.invoiceNumber.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceStr = String(sequence).padStart(3, '0');
  return `${prefix}${sequenceStr}`;
};

/**
 * Generate purchase number
 * Format: PO-YYYYMM-XXX
 * Example: PO-202412-001
 */
export const generatePurchaseNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PO-${year}${month}-`;

  // Find last purchase with same prefix
  const lastPurchase = await Purchase.findOne({
    purchaseNumber: { $regex: `^${prefix}` }
  }).sort({ purchaseNumber: -1 });

  let sequence = 1;
  if (lastPurchase) {
    const lastNumber = lastPurchase.purchaseNumber.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceStr = String(sequence).padStart(3, '0');
  return `${prefix}${sequenceStr}`;
};

/**
 * Generate payment number
 * Format: PMT-YYYYMM-XXX
 * Example: PMT-202412-001
 */
export const generatePaymentNumber = async (PaymentModel) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PMT-${year}${month}-`;

  // Find last payment with same prefix
  const lastPayment = await PaymentModel.findOne({
    paymentNumber: { $regex: `^${prefix}` }
  }).sort({ paymentNumber: -1 });

  let sequence = 1;
  if (lastPayment) {
    const lastNumber = lastPayment.paymentNumber.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceStr = String(sequence).padStart(3, '0');
  return `${prefix}${sequenceStr}`;
};

/**
 * Generate stock adjustment number
 * Format: ADJ-YYYYMM-XXX
 * Example: ADJ-202412-001
 */
export const generateAdjustmentNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `ADJ-${year}${month}-`;

  // Count adjustments for current month
  const count = await StockTransaction.countDocuments({
    'reference.module': 'manual_adjustment',
    createdAt: {
      $gte: new Date(year, now.getMonth(), 1),
      $lt: new Date(year, now.getMonth() + 1, 1)
    }
  });

  const sequence = count + 1;
  const sequenceStr = String(sequence).padStart(3, '0');
  return `${prefix}${sequenceStr}`;
};

/**
 * Validate number format
 */
export const validateNumberFormat = (number, type) => {
  const patterns = {
    invoice: /^INV-\d{6}-\d{3}$/,
    purchase: /^PO-\d{6}-\d{3}$/,
    payment: /^PMT-\d{6}-\d{3}$/,
    adjustment: /^ADJ-\d{6}-\d{3}$/
  };

  return patterns[type] ? patterns[type].test(number) : false;
};