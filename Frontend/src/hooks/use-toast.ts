import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

const toastAdapter = (props: ToastProps) => {
  const { title, description, variant } = props;
  if (variant === "destructive") {
    return sonnerToast.error(title || "Error", { description });
  }
  if (variant === "success") {
    return sonnerToast.success(title || "Success", { description });
  }
  return sonnerToast(title || "Notification", { description });
};

export function useToast() {
  return {
    toast: toastAdapter,
    toasts: []
  };
}
