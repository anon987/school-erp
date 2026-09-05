"use client";

import { useState, useTransition } from "react";
import { createRazorpayOrderAction } from "../actions";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  handler: () => void;
  modal?: { ondismiss?: () => void };
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

/**
 * NOT exercised end-to-end -- no Razorpay sandbox credentials in this environment to actually
 * open Checkout or receive a real webhook against. Wired to createRazorpayOrderAction /
 * packages/integrations/payments per Razorpay's documented Checkout.js integration; review
 * against a real test account before relying on it.
 *
 * Confirmation is NEVER assumed from Checkout's own success handler (CLAUDE.md: never mark paid
 * from a client-side callback) -- closing the modal just prompts a refresh; the invoice only
 * shows paid once apps/worker's webhook has actually updated it.
 */
export function PayOnlineButton({ invoiceId, dueAmountPaise, schoolName }: { invoiceId: string; dueAmountPaise: number; schoolName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  function handleClick() {
    setError(null);
    // See attendance/components/MarkingClient.tsx's handleSubmit for why this is wrapped instead
    // of passing an async function directly.
    startTransition(() => {
      void (async () => {
        const result = await createRazorpayOrderAction(invoiceId, dueAmountPaise);
        if (result.error || !result.orderId || !result.keyId) {
          setError(result.error ?? "Could not start online payment.");
          return;
        }

        try {
          await loadRazorpayScript();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not load the payment window.");
          return;
        }

        if (!window.Razorpay) {
          setError("Payment window unavailable.");
          return;
        }

        const checkout = new window.Razorpay({
          key: result.keyId,
          amount: result.amountPaise ?? dueAmountPaise,
          currency: "INR",
          order_id: result.orderId,
          name: schoolName,
          handler: () => setAwaitingConfirmation(true),
          modal: { ondismiss: () => setAwaitingConfirmation(false) },
        });
        checkout.open();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Starting…" : "Pay online"}
      </button>
      {awaitingConfirmation ? (
        <p className="text-xs text-muted-foreground">Waiting for the payment gateway to confirm -- refresh in a moment to see it reflected.</p>
      ) : null}
      {error ? <p className="text-xs text-danger-solid">{error}</p> : null}
    </div>
  );
}
