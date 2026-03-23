import React, { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // Allows customizing width (e.g., 'max-w-md', 'max-w-4xl')
};

const Modal = ({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-md",
}: ModalProps) => {
  // Lock the background page scroll when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Outer fixed container handles the scrollbar for the modal content
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Flex container ensures centering if content is small, but allows expanding if large */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        {/* Backdrop (Fixed to viewport) */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Panel (Relative to scrollable container) */}
        <div
          className={`relative transform text-left align-middle transition-all w-full ${maxWidth} bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 z-10`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
