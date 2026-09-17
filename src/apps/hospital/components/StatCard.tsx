import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changePositive?: boolean;
  icon: string;
  accent?: "green" | "amber" | "sky" | "red";
  glass?: boolean;
}

const ACCENTS = {
  green: "from-[#1B4332] to-[#2D6A4F]",
  amber: "from-[#F4A300] to-[#FFD166]",
  sky: "from-[#4A90D9] to-[#6BA8E5]",
  red: "from-[#E63946] to-[#FF6B6B]",
};

export default function StatCard({ label, value, unit, change, changePositive, icon, accent = "green", glass }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const numericVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const isNumeric = !isNaN(numericVal) && typeof value === "number";

  useEffect(() => {
    if (!isNumeric) return;
    let start = 0;
    const end = numericVal;
    const duration = 1200;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplayed(end); clearInterval(timer); }
      else setDisplayed(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [numericVal, isNumeric]);

  return (
    <div className={`rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${glass ? "glass-card border border-white/50" : "bg-white border border-[#E8E5DF]"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${ACCENTS[accent]} flex items-center justify-center text-xl shadow-sm`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${changePositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {changePositive ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold font-display text-gray-900">
          {isNumeric ? displayed.toLocaleString() : value}
          {unit && <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>}
        </p>
        <p className="text-sm text-gray-500 mt-1 font-body">{label}</p>
      </div>
    </div>
  );
}
