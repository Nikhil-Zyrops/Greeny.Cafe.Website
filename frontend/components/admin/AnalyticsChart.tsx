"use client";



// ==========================================
// 1. WEEKLY REVENUE CHART (Vertical Bars)
// ==========================================
interface WeeklyData {
  day: string;
  revenue: number;
}
export function WeeklyRevenueChart({ data }: { data: WeeklyData[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100);

  return (
    <div className="flex flex-col h-full font-sans text-xs">
      <div className="flex items-end justify-between gap-2 h-[180px] pt-4 border-b border-border">
        {data.map((d, idx) => {
          const heightPct = (d.revenue / maxRevenue) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Tooltip value */}
              <span className="opacity-0 group-hover:opacity-100 bg-text text-white text-[9px] px-1 py-0.5 rounded shadow-sm mb-1 transition-opacity font-mono font-bold">
                ₹{Number(d.revenue).toFixed(0)}
              </span>
              {/* Bar element */}
              <div 
                className="w-full bg-primary hover:bg-primary-light transition-all rounded-t-md cursor-pointer shadow-sm group-hover:scale-x-105"
                style={{ height: `${Math.max(4, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* Day Labels */}
      <div className="flex justify-between gap-2 pt-2 text-[10px] text-text-3 font-semibold text-center">
        {data.map((d, idx) => (
          <div key={idx} className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {d.day.split(",")[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. PEAK HOURS CHART (Vertical Bars)
// ==========================================
interface PeakHourData {
  hour: string;
  count: number;
}
export function PeakHoursChart({ data }: { data: PeakHourData[] }) {
  // Only show busy hours from 08:00 to 22:00 to avoid empty space
  const filteredData = data.filter((d) => {
    const h = parseInt(d.hour.split(":")[0]);
    return h >= 8 && h <= 22;
  });

  const maxCount = Math.max(...filteredData.map((d) => d.count), 1);

  return (
    <div className="flex flex-col h-full font-sans text-xs">
      <div className="flex items-end justify-between gap-1 h-[180px] pt-4 border-b border-border">
        {filteredData.map((d, idx) => {
          const heightPct = (d.count / maxCount) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <span className="opacity-0 group-hover:opacity-100 bg-text text-white text-[9px] px-1 py-0.5 rounded shadow-sm mb-1 transition-opacity font-mono font-bold">
                {d.count}
              </span>
              <div 
                className="w-full bg-blue-500 hover:bg-blue-400 transition-all rounded-t-sm cursor-pointer"
                style={{ height: `${Math.max(4, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-1 pt-2 text-[9px] text-text-3 font-mono font-semibold text-center">
        {filteredData.map((d, idx) => {
          const h = d.hour.split(":")[0];
          // Show every alternate label to save space
          return (
            <div key={idx} className="flex-1 overflow-hidden">
              {idx % 2 === 0 ? h : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 3. TOP SELLING ITEMS CHART (Horizontal Bars)
// ==========================================
interface TopItemData {
  name: string;
  emoji: string;
  total_quantity: number;
  total_revenue: number;
}
export function TopSellingItemsChart({ data }: { data: TopItemData[] }) {
  const maxQty = Math.max(...data.map((d) => d.total_quantity), 1);

  return (
    <div className="space-y-3 font-sans text-xs">
      {data.map((item, idx) => {
        const widthPct = (item.total_quantity / maxQty) * 100;

        return (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold text-text-2">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="text-base">{item.emoji}</span>
                {item.name}
              </span>
              <span className="text-text-3 font-mono font-bold">
                {item.total_quantity} sold (₹{Number(item.total_revenue).toFixed(0)})
              </span>
            </div>
            {/* Horizontal progress bar */}
            <div className="h-4 w-full bg-surface-2 rounded-md overflow-hidden border border-border">
              <div 
                className="h-full bg-primary hover:bg-primary-light transition-all rounded-r-md cursor-pointer"
                style={{ width: `${Math.max(2, widthPct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
