// src/components/dashboard/quality-chart.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ClientOnly } from "./client-only";

interface QualityChartProps {
  completeCount: number;
  incompleteCount: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export function QualityChart({ completeCount, incompleteCount }: QualityChartProps) {
  const data: ChartData[] = [
    {
      name: "Complete",
      value: completeCount,
      color: "#22c55e", // green-500
    },
    {
      name: "Incomplete",
      value: incompleteCount,
      color: "#eab308", // yellow-500
    },
  ];

  const total = completeCount + incompleteCount;
  const completionRate = total > 0 ? Math.round((completeCount / total) * 100) : 0;

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} products ({Math.round((data.value / total) * 100)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ClientOnly fallback={
      <div className="w-full h-64 flex items-center justify-center text-muted-foreground">
        Loading chart...
      </div>
    }>
      <div className="w-full h-64">
        <div className="text-center mb-2">
          <p className="text-sm font-medium text-muted-foreground">Product Completeness</p>
          <p className="text-2xl font-bold">{completionRate}%</p>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="text-center mt-2 text-xs text-muted-foreground">
          {total} total products
        </div>
      </div>
    </ClientOnly>
  );
}
