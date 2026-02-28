"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ErrorMessageProps {
    error: any;
    onRetry?: () => void;
    className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    error,
    onRetry,
    className = "",
}) => {
    // Extract error message from different error formats
    const getErrorMessage = (error: any): string => {
        if (typeof error === "string") {
            return error;
        }

        if (error?.message) {
            return error.message;
        }

        if (error?.error) {
            return error.error;
        }

        if (typeof error === "object") {
            try {
                return JSON.stringify(error);
            } catch {
                return "An unknown error occurred";
            }
        }

        return "An unknown error occurred";
    };

    const errorMessage = getErrorMessage(error);

    return (
        <div className="flex justify-start max-w-3xl mx-auto w-full m-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-lg border border-destructive/20 bg-background p-4 max-w-full ${className}`}
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-destructive mb-1">
                            {"Error"}
                        </h4>
                        <p className="text-sm text-muted-foreground break-words">
                            {errorMessage}
                        </p>
                    </div>
                    {onRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="flex-shrink-0"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {"Retry"}
                        </Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
