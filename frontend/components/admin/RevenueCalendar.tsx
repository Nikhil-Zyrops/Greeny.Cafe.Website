"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface DayData {
  date: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  top_item: string;
}

export default function RevenueCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<number, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  // Month labels
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/calendar?year=${year}&month=${month}`);
        if (res.data.success) {
          setCalendarData(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching calendar:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
    setSelectedDay(null); // clear selection on month change
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  // Calendar calculations
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const totalDays = new Date(year, month, 0).getDate();

  // Create blanks before 1st day of month
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const formatCurrency = (val: number) => {
    const num = Number(val);
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
    return `₹${num.toFixed(0)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Calendar Grid (2 columns wide on large screens) */}
      <Card className="lg:col-span-2 border-border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-text text-base flex items-center gap-1.5">
              <CalendarIcon size={18} className="text-primary" />
              Revenue Calendar
            </h3>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border" onClick={handlePrevMonth}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-xs font-bold text-text-2 min-w-[100px] text-center">
                {monthNames[month - 1]} {year}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border" onClick={handleNextMonth}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Calendar Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-text-3 uppercase mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Body */}
          {loading ? (
            <div className="flex items-center justify-center h-[260px] text-xs text-text-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading calendar...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`blank-${idx}`} className="h-14 bg-surface-2/20 border border-transparent rounded-lg"></div>;
                }

                const dayData = calendarData[day];
                const revenue = dayData ? dayData.revenue : 0;
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`h-14 flex flex-col justify-between p-1.5 border text-left rounded-lg transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-white scale-105 shadow-md"
                        : "bg-surface border-border hover:border-primary/50 text-text"
                    }`}
                  >
                    <span className="text-[10px] font-bold">{day}</span>
                    {revenue > 0 && (
                      <span className={`text-[9px] font-black font-mono self-end ${
                        isSelected ? "text-white" : "text-primary"
                      }`}>
                        {formatCurrency(revenue)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Details Panel */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full min-h-[300px]">
          <div>
            <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-4">
              Day Details
            </h3>

            {selectedDay === null ? (
              <div className="text-center py-12 text-text-3 text-xs space-y-2">
                <div className="text-3xl">📅</div>
                <p>Click on any day in the calendar grid to inspect detailed daily analytics.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                <div className="flex justify-between items-center text-sm font-bold text-text mb-2">
                  <span>Selected Date:</span>
                  <span className="text-primary font-display">
                    {monthNames[month - 1]} {selectedDay}, {year}
                  </span>
                </div>

                <div className="bg-surface-2 p-3 rounded-lg border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-3">Daily Revenue</span>
                    <strong className="text-primary font-display text-sm">
                      ₹{Number(calendarData[selectedDay]?.revenue || 0).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">Total Orders</span>
                    <strong className="text-text">{calendarData[selectedDay]?.orders || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">Avg Order Value</span>
                    <strong className="text-text">
                      ₹{Number(calendarData[selectedDay]?.avg_order_value || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-text-3 font-semibold">Top Selling Item:</span>
                  <div className="bg-primary/5 border border-primary-light/20 p-2.5 rounded-lg text-primary font-bold">
                     {calendarData[selectedDay]?.top_item || "No sales data"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedDay !== null && calendarData[selectedDay]?.orders > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Detailed report exported.")}
              className="mt-6 border-primary text-primary hover:bg-primary hover:text-white rounded-lg w-full font-bold"
            >
              Export Day Report
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
