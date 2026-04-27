import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RequestChart = ({ data }) => {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(120, 135, 150, 0.22)" />
          <XAxis dataKey="time" tick={{ fill: "#72808f", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#72808f", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid rgba(21, 33, 43, 0.08)",
              boxShadow: "0 18px 28px rgba(0, 0, 0, 0.12)",
            }}
          />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 3, strokeWidth: 0, fill: "#0f766e" }}
            activeDot={{ r: 5, fill: "#c97a19" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RequestChart;
