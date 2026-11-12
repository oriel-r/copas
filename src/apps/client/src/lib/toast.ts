import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastOptions {
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${toastCounter++}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export function toast(options: { title: string } & ToastOptions): string {
  const { title, description, variant = 'default', duration = 4500 } = options;
  return useToastStore.getState().addToast({
    title,
    description,
    variant,
    duration,
  });
}

toast.success = (title: string, options?: ToastOptions): string => {
  return toast({
    title,
    ...options,
    variant: 'success',
  });
};

toast.error = (title: string, options?: ToastOptions): string => {
  return toast({
    title,
    ...options,
    variant: 'error',
  });
};

toast.info = (title: string, options?: ToastOptions): string => {
  return toast({
    title,
    ...options,
    variant: 'info',
  });
};

toast.dismiss = (id: string): void => {
  useToastStore.getState().removeToast(id);
};
