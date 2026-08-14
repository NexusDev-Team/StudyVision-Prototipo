import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => setToast(msg);
  const clearToast = () => setToast(null);
  return { toast, showToast, clearToast };
}
