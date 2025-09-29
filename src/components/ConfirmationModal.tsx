// src/components/ConfirmationModal.tsx
// Minimal placeholder so imports compile cleanly.

type ConfirmationModalProps = {
  open?: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function ConfirmationModal(_: ConfirmationModalProps) {
  // TODO: implement real modal later
  return null;
}
