import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

const AuditChart = ({ data, actions, type = "line" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">No audit data available for the selected period.</p>
      </div>
    );
  }

  const renderLines = () => {
    return actions.map((action, index) => (
      <Line
        key={action}
        type="monotone"
        dataKey={action}
        stroke={COLORS[index % COLORS.length]}
        strokeWidth={2}
        activeDot={{ r: 6 }}
        dot={false}
      />
    ));
  };

  const renderBars = () => {
    return actions.map((action, index) => (
      <Bar
        key={action}
        dataKey={action}
        fill={COLORS[index % COLORS.length]}
        radius={[4, 4, 0, 0]}
      />
    ));
  };

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "line" ? (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: "#0f172a", fontSize: "14px" }}
              labelStyle={{ color: "#64748b", marginBottom: "4px" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            {renderLines()}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              }}
              cursor={{ fill: "#f1f5f9" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            {renderBars()}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default AuditChart;
