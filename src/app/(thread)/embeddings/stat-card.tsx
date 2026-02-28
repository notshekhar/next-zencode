export function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border bg-muted p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}
