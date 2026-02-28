"use client";

import { useState } from "react";
import { Search, Loader2, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/trpc/react";
import { ChunkCard } from "./chunk-card";

export function SemanticSearch() {
    const [query, setQuery] = useState("");
    const searchMutation = api.embeddings.search.useMutation();

    const handleSearch = () => {
        if (!query.trim()) return;
        searchMutation.mutate({ query: query.trim(), limit: 20 });
    };

    return (
        <div>
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search your codebase semantically..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10 h-11 rounded-xl"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={searchMutation.isPending || !query.trim()}
                    className="rounded-xl h-11 px-6"
                >
                    {searchMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        "Search"
                    )}
                </Button>
            </div>

            {searchMutation.data && searchMutation.data.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                        {searchMutation.data.length} results
                    </p>
                    <AnimatePresence mode="popLayout">
                        {searchMutation.data.map((result, i) => (
                            <motion.div
                                key={result.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <ChunkCard
                                    filePath={result.filePath}
                                    startLine={result.startLine}
                                    endLine={result.endLine}
                                    content={result.content}
                                    language={result.language}
                                    similarity={result.similarity}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {searchMutation.data?.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>No results found</p>
                </div>
            )}

            {!searchMutation.data && !searchMutation.isPending && (
                <div className="text-center py-16 text-muted-foreground">
                    <BrainCircuit className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>Enter a query to search your codebase by meaning</p>
                    <p className="text-xs mt-1 opacity-60">
                        Try: &quot;authentication logic&quot;, &quot;database
                        queries&quot;, &quot;error handling&quot;
                    </p>
                </div>
            )}
        </div>
    );
}
