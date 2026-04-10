import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// Razorpay script loading utility
let razorpayScriptPromise: Promise<void> | null = null;

const loadRazorpayScript = (): Promise<void> => {
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  // Check if already loaded
  if ((window as any).Razorpay) {
    return Promise.resolve();
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("✅ Razorpay SDK loaded successfully");
      resolve();
    };

    script.onerror = () => {
      console.error("❌ Failed to load Razorpay SDK");
      razorpayScriptPromise = null;
      reject(new Error("Failed to load Razorpay SDK"));
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

interface RazorpayButtonProps {
  // Payment details
  amount: number;
  currency?: string;
  name: string;
  description: string;

  // Optional payment metadata
  lawyerId?: string;
  lawyerName?: string;
  productId?: string;
  category?: string;

  // Button customization
  buttonText?: string;
  buttonClassName?: string;
  icon?: React.ReactNode;

  // Event handlers
  onPaymentSuccess?: (response: any) => void;
  onPaymentFailure?: (error: any) => void;
  onPaymentError?: (error: any) => void;

  // User prefill data
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };

  // Theme
  themeColor?: string;

  // Loading state
  loadingText?: string;

  // Disabled state
  disabled?: boolean;
}

// Check required environment variables
const checkRequiredEnvVars = () => {
  const required = ["VITE_RAZORPAY_KEY_ID"];
  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  console.log("✅ All required environment variables are set");
};

// Logger utility
const logPaymentFlow = (stage: string, data?: any) => {
  console.group(`💸 Payment Flow: ${stage}`);
  if (data) console.log(data);
  console.groupEnd();
};

const RazorpayButton: React.FC<RazorpayButtonProps> = ({
  amount,
  currency = "INR",
  name,
  description,
  lawyerId,
  lawyerName,
  productId,
  category,
  buttonText = "Pay Now",
  buttonClassName = "flex gap-2 justify-center items-center px-6 py-3 w-full font-medium text-white bg-primary-600 rounded-xl transition-colors duration-200 hover:bg-primary-700",
  icon,
  onPaymentSuccess,
  onPaymentFailure,
  onPaymentError,
  prefill = {
    name: "Test User",
    email: "test@example.com",
    contact: "9999999999",
  },
  themeColor = "#3B82F6",
  loadingText = "Processing...",
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Preload Razorpay script on component mount (lazy loading)
  useEffect(() => {
    let isMounted = true;

    // Only preload if button is not disabled
    if (!disabled) {
      loadRazorpayScript()
        .then(() => {
          if (isMounted) {
            setIsScriptLoaded(true);
          }
        })
        .catch((err) => {
          console.warn("Razorpay script preload failed:", err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [disabled]);

  const handlePayment = useCallback(async () => {
    if (disabled || isLoading) return;

    try {
      setIsLoading(true);

      // Check environment variables
      checkRequiredEnvVars();

      // Ensure Razorpay script is loaded
      await loadRazorpayScript();

      // Check if Razorpay is available
      if (!(window as any).Razorpay) {
        throw new Error(
          "Razorpay SDK not found. Please ensure the Razorpay script is loaded.",
        );
      }

      logPaymentFlow("Initializing Payment", {
        amount,
        currency,
        name,
        description,
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount in paise
        currency,
        name,
        description,
        handler: function (response: any) {
          logPaymentFlow("Payment Success", {
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });

          // Call custom success handler if provided
          if (onPaymentSuccess) {
            onPaymentSuccess(response);
          } else {
            // Default success message
            alert(
              `Payment successful! ${name}.\n\nPayment ID: ${response.razorpay_payment_id}`,
            );
          }

          setIsLoading(false);
        },
        prefill,
        notes: {
          ...(lawyerId && { lawyerId }),
          ...(lawyerName && { lawyerName }),
          ...(productId && { productId }),
          ...(category && { category }),
        },
        theme: {
          color: themeColor,
        },
      };

      const razorpay = new (window as any).Razorpay(options);

      razorpay.on("payment.failed", function (response: any) {
        logPaymentFlow("Payment Failed", response.error);

        // Call custom failure handler if provided
        if (onPaymentFailure) {
          onPaymentFailure(response.error);
        } else {
          // Default failure message
          alert("Payment failed. Please try again.");
        }

        setIsLoading(false);
      });

      logPaymentFlow("Opening Payment Modal");
      razorpay.open();
    } catch (error) {
      logPaymentFlow("Payment Error", {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      });

      // Call custom error handler if provided
      if (onPaymentError) {
        onPaymentError(error);
      } else {
        // Default error message
        alert("Something went wrong. Please try again later.");
      }

      setIsLoading(false);
    }
  }, [
    disabled,
    isLoading,
    amount,
    currency,
    name,
    description,
    lawyerId,
    lawyerName,
    productId,
    category,
    prefill,
    themeColor,
    onPaymentSuccess,
    onPaymentFailure,
    onPaymentError,
  ]);

  return (
    <motion.button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      className={`${buttonClassName} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${isLoading ? "opacity-75" : ""}`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {icon}
          {buttonText}
        </>
      )}
    </motion.button>
  );
};

export default RazorpayButton;
