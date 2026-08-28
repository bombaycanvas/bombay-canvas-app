declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    key: string;
    // One-time orders pass amount/currency/order_id; subscription checkout
    // passes subscription_id alone and Razorpay resolves the amount from the
    // plan. Both shapes are valid, so none of them is required here.
    amount?: string;
    currency?: string;
    order_id?: string;
    subscription_id?: string;
    name?: string;
    description?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    method?: Record<string, boolean>;
    upi?: {
      flow?: string;
    };
    image?: string;
    notes?: Record<string, any>;
  }

  // EVERY field is optional on purpose. Card checkout completes inside the
  // Razorpay sheet and returns the full signed set, but a UPI-intent payment
  // (GPay/PhonePe) is authorised in an external app and can return a partial
  // payload — often payment_id only. Callers must handle each field being
  // absent and must not treat a missing signature as payment failure;
  // activation is decided by the Razorpay webhook, not by this payload.
  interface RazorpaySuccessResponse {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  }

  interface RazorpayErrorResponse {
    code: number;
    description: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
