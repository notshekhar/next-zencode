"use client";

import { memo, useCallback, ReactNode, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopy } from "@/hooks/use-copy";
import { Copy, Download, FileText, Table2, Check } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedTableProps {
    children: ReactNode;
    className?: string;
}

// Helper function to extract table data from React children
const extractTableData = (children: ReactNode): string[][] => {
    const rows: string[][] = [];

    // Recursively extract text content from any React element
    const extractTextFromElement = (element: any): string => {
        if (typeof element === "string") return element;
        if (typeof element === "number") return element.toString();
        if (element === null || element === undefined) return "";

        if (element?.props?.children) {
            if (Array.isArray(element.props.children)) {
                return element.props.children
                    .map(extractTextFromElement)
                    .filter((text: string) => text.trim() !== "")
                    .join(" ");
            }
            return extractTextFromElement(element.props.children);
        }
        return "";
    };

    // Parse the table structure recursively
    const parseElement = (element: any) => {
        if (!element) return;

        console.log("Parsing element:", element);

        // Handle arrays of elements
        if (Array.isArray(element)) {
            element.forEach(parseElement);
            return;
        }

        // Check for React component types
        const elementType =
            element?.type?.displayName || element?.type?.name || element?.type;
        console.log("Element type:", elementType);

        // Handle table sections (thead, tbody) - check both string types and component types
        if (
            elementType === "thead" ||
            elementType === "tbody" ||
            element?.type === "thead" ||
            element?.type === "tbody"
        ) {
            if (Array.isArray(element.props?.children)) {
                element.props.children.forEach(parseElement);
            } else if (element.props?.children) {
                parseElement(element.props.children);
            }
        }
        // Handle table rows
        else if (elementType === "tr" || element?.type === "tr") {
            const row: string[] = [];
            const rowChildren = element.props?.children;

            console.log("Processing table row, children:", rowChildren);

            if (Array.isArray(rowChildren)) {
                rowChildren.forEach((cell: any) => {
                    const cellType =
                        cell?.type?.displayName ||
                        cell?.type?.name ||
                        cell?.type;
                    if (
                        cellType === "td" ||
                        cellType === "th" ||
                        cell?.type === "td" ||
                        cell?.type === "th"
                    ) {
                        const cellText = extractTextFromElement(
                            cell.props?.children,
                        );
                        console.log("Cell text:", cellText);
                        row.push(cellText.trim());
                    }
                });
            } else if (
                rowChildren?.type === "td" ||
                rowChildren?.type === "th"
            ) {
                const cellText = extractTextFromElement(
                    rowChildren.props?.children,
                );
                row.push(cellText.trim());
            }

            console.log("Row data:", row);
            if (row.length > 0) {
                rows.push(row);
            }
        }
        // Handle nested elements
        else if (element?.props?.children) {
            parseElement(element.props.children);
        }
    };

    console.log("Starting table data extraction from children:", children);
    parseElement(children);
    console.log("Final extracted rows:", rows);
    return rows;
};

// Convert table data to CSV format
const tableToCSV = (data: string[][]): string => {
    return data
        .map((row) =>
            row
                .map((cell) => {
                    // Escape cells containing commas, quotes, or newlines
                    if (
                        cell.includes(",") ||
                        cell.includes('"') ||
                        cell.includes("\n")
                    ) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                })
                .join(","),
        )
        .join("\n");
};

// Convert table data to markdown format
const tableToMarkdown = (data: string[][]): string => {
    if (data.length === 0) return "";

    const [header, ...rows] = data;
    let markdown = "| " + header.join(" | ") + " |\n";
    markdown += "| " + header.map(() => "---").join(" | ") + " |\n";

    rows.forEach((row) => {
        markdown += "| " + row.join(" | ") + " |\n";
    });

    return markdown;
};

// Download helper function
const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const EnhancedTable = memo(
    ({ children, className = "" }: EnhancedTableProps) => {
        const { copied, copy } = useCopy();
        const tableRef = useRef<HTMLTableElement>(null);

        // Alternative DOM-based extraction method
        const extractTableDataFromDOM = (): string[][] => {
            if (!tableRef.current) return [];

            const rows: string[][] = [];
            const tableRows = tableRef.current.querySelectorAll("tr");

            tableRows.forEach((row) => {
                const cells: string[] = [];
                const tableCells = row.querySelectorAll("td, th");

                tableCells.forEach((cell) => {
                    cells.push(cell.textContent?.trim() || "");
                });

                if (cells.length > 0) {
                    rows.push(cells);
                }
            });

            return rows;
        };

        const handleCopyTable = useCallback(async () => {
            try {
                // Try DOM-based extraction first
                let tableData = extractTableDataFromDOM();
                console.log("DOM-based extracted table data:", tableData);

                // Fallback to React-based extraction
                if (tableData.length === 0) {
                    tableData = extractTableData(children);
                    console.log("React-based extracted table data:", tableData);
                }

                if (tableData.length === 0) {
                    console.warn("No table data found to copy");
                    return;
                }

                const csvContent = tableToCSV(tableData);
                console.log("CSV content:", csvContent);

                // Use the copy hook
                copy(csvContent);
            } catch (error) {
                console.error("Error copying table:", error);
            }
        }, [children, copy]);

        const handleDownloadCSV = useCallback(() => {
            try {
                // Try DOM-based extraction first
                let tableData = extractTableDataFromDOM();
                console.log(
                    "DOM-based extracted table data for CSV:",
                    tableData,
                );

                // Fallback to React-based extraction
                if (tableData.length === 0) {
                    tableData = extractTableData(children);
                    console.log(
                        "React-based extracted table data for CSV:",
                        tableData,
                    );
                }

                if (tableData.length === 0) {
                    console.warn("No table data found to download");
                    return;
                }

                const csvContent = tableToCSV(tableData);
                console.log("CSV content for download:", csvContent);

                const timestamp = new Date()
                    .toISOString()
                    .slice(0, 19)
                    .replace(/:/g, "-");
                downloadFile(csvContent, `table-${timestamp}.csv`, "text/csv");
            } catch (error) {
                console.error("Error downloading CSV:", error);
            }
        }, [children]);

        const handleDownloadMarkdown = useCallback(() => {
            try {
                // Try DOM-based extraction first
                let tableData = extractTableDataFromDOM();
                console.log(
                    "DOM-based extracted table data for MD:",
                    tableData,
                );

                // Fallback to React-based extraction
                if (tableData.length === 0) {
                    tableData = extractTableData(children);
                    console.log(
                        "React-based extracted table data for MD:",
                        tableData,
                    );
                }

                if (tableData.length === 0) {
                    console.warn("No table data found to download");
                    return;
                }

                const markdownContent = tableToMarkdown(tableData);
                console.log("Markdown content for download:", markdownContent);

                const timestamp = new Date()
                    .toISOString()
                    .slice(0, 19)
                    .replace(/:/g, "-");
                downloadFile(
                    markdownContent,
                    `table-${timestamp}.md`,
                    "text/markdown",
                );
            } catch (error) {
                console.error("Error downloading Markdown:", error);
            }
        }, [children]);

        return (
            <div className="my-6">
                {/* Table container with separate scrollable area and fixed footer */}
                <div className="rounded-lg border bg-background">
                    {/* Scrollable table container */}
                    <div className="overflow-x-auto rounded-t-lg">
                        <table
                            ref={tableRef}
                            className={`w-full border-collapse ${className}`}
                        >
                            {children}
                        </table>
                    </div>

                    {/* Fixed table footer with action buttons */}
                    <div className="flex items-center justify-end gap-1 p-2 bg-muted/30 border-t">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyTable}
                                    className="h-8 w-8 p-0"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {copied ? "Copied" : "Copy Table"}
                            </TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{"Download"}</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <Table2 className="mr-2 h-4 w-4" />
                                    {"Download CSV"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleDownloadMarkdown}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    {"Download Markdown"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        );
    },
);

EnhancedTable.displayName = "EnhancedTable";

export { EnhancedTable };
