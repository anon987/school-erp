/**
 * docs/schoolerp_techstack.md §5: every external service goes behind an adapter interface here,
 * business logic never imports a vendor SDK directly. Schools arrive with vendors already
 * chosen (or, for payments specifically, will move off Razorpay eventually) -- this is the seam
 * that keeps a vendor swap from becoming a rewrite of apps/web/src/lib/fees.
 */
export interface CreateOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
}

export interface PaymentProvider {
  createOrder(receiptNumber: string, amountPaise: number): Promise<CreateOrderResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
