"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface ReceiptViewerProps {
  isOpen: boolean;
  onClose: () => void;
  receiptPath: string | null;
}

export function ReceiptViewer({
  isOpen,
  onClose,
  receiptPath,
}: ReceiptViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset state when opening with a new receipt
  function handleOpen() {
    setImageLoaded(false);
    setImageError(false);
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt"
      className="max-w-2xl"
    >
      {!receiptPath ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-400">No receipt available.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Loading state */}
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="text-sm text-gray-400">Loading receipt...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-red-500">
                  Failed to load receipt image.
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  The file may have been moved or deleted.
                </p>
              </div>
            </div>
          )}

          {/* Receipt image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/receipts/${encodeURIComponent(receiptPath)}`}
            alt="Receipt"
            className={`w-full rounded-lg ${imageLoaded ? "block" : "hidden"}`}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
          />
        </div>
      )}
    </Modal>
  );
}
