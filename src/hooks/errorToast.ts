import { toast } from "sonner";

export function errorToast(error: unknown) {
    toast.error(
        error instanceof Error ? error.message : "Something went wrong",
    );
}
