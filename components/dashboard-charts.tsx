"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, CartesianGrid, XAxis, YAxis, BarChart, Bar, LineChart, Line, AreaChart, Area } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9"];
const RADIAN = Math.PI / 180;

// Dữ liệu mẫu - thực tế sẽ lấy từ API
const studentData = [
  { name: "CNTT 1", value: 400 },
  { name: "CNTT 2", value: 300 },
  { name: "CNTT 3", value: 200 },
  { name: "Khác", value: 100 },
];

const monthlyData = [
  { month: "Tháng 1", applications: 45, approved: 38 },
  { month: "Tháng 2", applications: 52, approved: 45 },
  { month: "Tháng 3", applications: 38, approved: 35 },
  { month: "Tháng 4", applications: 61, approved: 52 },
];

const progressData = [
  { day: "Thứ 2", count: 45 },
  { day: "Thứ 3", count: 52 },
  { day: "Thứ 4", count: 38 },
  { day: "Thứ 5", count: 61 },
  { day: "Thứ 6", count: 42 },
  { day: "Thứ 7", count: 28 },
];

export function DashboardPieChart({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : 0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardBarChart({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip />
          <Legend />
          <Bar dataKey="applications" fill="#6366f1" name="Hồ sơ mới" />
          <Bar dataKey="approved" fill="#10b981" name="Đã duyệt" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardLineChart({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="day" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip />
          <Area type="monotone" dataKey="count" stroke="#6366f1" fill="rgba(99, 102, 241, 0.2)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardKPICard({ title, value, change, icon: Icon }: { 
  title: string; 
  value: string | number; 
  change?: string;
  icon: any;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h4>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
          <Icon size={24} className="text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
      {change && (
        <p className="text-xs text-green-600 dark:text-green-400">{change}</p>
      )}
    </div>
  );
}

export default function DashboardCharts() {
  return null;
}
