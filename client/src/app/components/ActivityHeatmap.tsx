"use client";

interface HeatmapProps {
    /** Map of "YYYY-MM-DD" → total points for that day */
    data: Record<string, number>;
}

const CELL = 14;
const GAP = 3;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getColor(points: number): string {
    if (points === 0) return "var(--heatmap-0)";
    if (points < 20) return "var(--heatmap-1)";
    if (points < 50) return "var(--heatmap-2)";
    if (points < 100) return "var(--heatmap-3)";
    return "var(--heatmap-4)";
}

export default function ActivityHeatmap({ data }: HeatmapProps) {
    // Build 52 weeks × 7 days grid ending today
    const today = new Date();
    const cells: { date: string; points: number; col: number; row: number }[] = [];

    for (let w = WEEKS - 1; w >= 0; w--) {
        for (let d = 0; d < DAYS; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (w * 7 + (today.getDay() - d)));
            if (date > today) continue;
            const key = date.toISOString().slice(0, 10);
            cells.push({
                date: key,
                points: data[key] || 0,
                col: WEEKS - 1 - w,
                row: d,
            });
        }
    }

    const svgW = WEEKS * (CELL + GAP) + 30;
    const svgH = DAYS * (CELL + GAP) + 20;

    return (
        <div className="heatmap-container">
            <h3 className="heatmap-title">Activity</h3>
            <div className="heatmap-scroll">
                <svg width={svgW} height={svgH} className="heatmap-svg">
                    {/* Day labels */}
                    {DAY_LABELS.map((label, i) =>
                        label ? (
                            <text
                                key={i}
                                x={0}
                                y={i * (CELL + GAP) + CELL + 14}
                                className="heatmap-label"
                            >
                                {label}
                            </text>
                        ) : null
                    )}
                    {/* Cells */}
                    {cells.map((cell) => (
                        <rect
                            key={cell.date}
                            x={cell.col * (CELL + GAP) + 30}
                            y={cell.row * (CELL + GAP) + 14}
                            width={CELL}
                            height={CELL}
                            rx={3}
                            fill={getColor(cell.points)}
                            className="heatmap-cell"
                        >
                            <title>
                                {cell.date}: {cell.points} pts
                            </title>
                        </rect>
                    ))}
                </svg>
            </div>
            {/* Legend */}
            <div className="heatmap-legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((i) => (
                    <span
                        key={i}
                        className="heatmap-legend-cell"
                        style={{ background: `var(--heatmap-${i})` }}
                    />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}
