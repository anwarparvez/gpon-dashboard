'use client';

export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  onConfirm,
  onCancel
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
      <div
        className="bg-white dark:bg-gray-900 text-black dark:text-white w-[320px] p-5 rounded shadow-lg"
        onClick={(e) => e.stopPropagation()} // prevent backdrop close on inner click
      >
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm mb-4">{message}</p>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white p-2 rounded"
          >
            Delete
          </button>

          <button
            onClick={onCancel}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white p-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}