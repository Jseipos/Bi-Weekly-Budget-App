"use client";

import { useState } from "react";
import { changePin } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ChangePinForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPin.length < 4) {
      setError("New PIN must be at least 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await changePin(currentPin, newPin);
      if (result.success) {
        setSuccess("PIN changed successfully.");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        setError(result.error || "Failed to change PIN.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <Input
        label="Current PIN"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={currentPin}
        onChange={(e) => setCurrentPin(e.target.value)}
        placeholder="Enter current PIN"
        required
      />
      <Input
        label="New PIN"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
        placeholder="At least 4 digits"
        required
      />
      <Input
        label="Confirm New PIN"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value)}
        placeholder="Re-enter new PIN"
        required
        error={
          confirmPin.length > 0 && newPin !== confirmPin
            ? "PINs do not match"
            : undefined
        }
      />

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {success && (
        <p className="text-sm font-medium text-green-600">{success}</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Changing..." : "Change PIN"}
      </Button>
    </form>
  );
}
