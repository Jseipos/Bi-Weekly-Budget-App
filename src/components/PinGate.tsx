"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPin } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

export function PinGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyPin(pin);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Incorrect PIN");
        setPin("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(digit: string) {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setError("");
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }

  function handleClear() {
    setPin("");
    setError("");
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
          <p className="mt-2 text-sm text-gray-500">Enter your PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PIN display */}
          <div className="mb-6 flex justify-center gap-3">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full transition-colors ${
                  i < pin.length ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="mb-4 text-center text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {digits.map((digit, i) => {
              if (digit === "" && i === 9) {
                return (
                  <button
                    key="clear"
                    type="button"
                    onClick={handleClear}
                    className="flex h-16 items-center justify-center rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                );
              }
              if (digit === "" && i === 11) {
                return (
                  <button
                    key="backspace"
                    type="button"
                    onClick={handleBackspace}
                    className="flex h-16 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7 4 0 7 7-7 7-4 0z" />
                    </svg>
                  </button>
                );
              }
              return (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="flex h-16 items-center justify-center rounded-xl bg-white border border-gray-200 text-xl font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
                >
                  {digit}
                </button>
              );
            })}
          </div>

          <Button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Verifying..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
