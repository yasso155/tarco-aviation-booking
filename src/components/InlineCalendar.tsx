import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon = 0, Sun = 6
};

const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
};

interface InlineCalendarProps {
  departureDate: Date | null;
  returnDate: Date | null;
  isRoundTrip: boolean;
  isFlexible: boolean;
  onDepartureChange: (d: Date | null) => void;
  onReturnChange: (d: Date | null) => void;
  onFlexibleChange: (v: boolean) => void;
  onClose: () => void;
  t: any;
  lang: string;
}

export const InlineCalendar: React.FC<InlineCalendarProps> = ({
  departureDate,
  returnDate,
  isRoundTrip,
  isFlexible,
  onDepartureChange,
  onReturnChange,
  onFlexibleChange,
  onClose,
  t,
  lang,
}) => {
  const [viewDate, setViewDate] = useState<Date>(departureDate || new Date());

  const handlePrev = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNext = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleDateClick = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return;

    if (!isRoundTrip) {
      onDepartureChange(date);
      onClose();
      return;
    }
    if (!departureDate || (departureDate && returnDate)) {
      onDepartureChange(date);
      onReturnChange(null);
    } else {
      if (date < departureDate) {
        onDepartureChange(date);
      } else {
        onReturnChange(date);
      }
    }
  };

  const renderMonth = (monthOffset: number) => {
    const t = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const year = t.getFullYear();
    const month = t.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const cells: React.ReactNode[] = [];

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e${month}-${i}`} className="w-9 h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today;
      const isDeparture = isSameDay(date, departureDate);
      const isReturn = isSameDay(date, returnDate);
      const isInRange = isRoundTrip && departureDate && returnDate && date > departureDate && date < returnDate;

      let cls = "w-9 h-9 flex items-center justify-center text-sm rounded-full transition-colors ";
      let wrapCls = "";

      if (isPast) {
        cls += "text-slate-300 cursor-not-allowed";
      } else if (isDeparture || isReturn) {
        cls += "bg-tarco-blue text-white font-bold cursor-pointer hover:bg-blue-700 ";
        if (isRoundTrip && departureDate && returnDate) {
          const isRTL = lang === 'ar';
          const startRounding = isRTL ? "rounded-r-full" : "rounded-l-full";
          const endRounding = isRTL ? "rounded-l-full" : "rounded-r-full";
          
          wrapCls = isDeparture ? `bg-tarco-blue/10 ${startRounding}` : `bg-tarco-blue/10 ${endRounding}`;
          cls = cls.replace("rounded-full", isDeparture ? startRounding : endRounding);
        }
      } else if (isInRange) {
        cls += "text-tarco-blue font-semibold cursor-pointer hover:bg-tarco-blue/20";
        wrapCls = "bg-tarco-blue/10";
      } else {
        cls += "text-slate-700 cursor-pointer hover:bg-slate-100";
      }

      cells.push(
        <div key={`${year}-${month}-${day}`} className={`relative flex items-center justify-center ${wrapCls}`}>
          <button type="button" onClick={() => handleDateClick(date)} disabled={isPast} className={cls}>
            {day}
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 min-w-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        key="inline-cal"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="border-t border-slate-100 pt-5 pb-2">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between mb-5 px-1">
            <button
              onClick={handlePrev}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex flex-1 justify-around px-4">
              {/* Left month title */}
              <span className="font-bold text-slate-800 text-sm">
                {MONTH_NAMES[new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getMonth()]}{' '}
                {new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getFullYear()}
              </span>
              {/* Right month title (desktop) */}
              <span className="hidden lg:block font-bold text-slate-800 text-sm">
                {MONTH_NAMES[new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1).getMonth()]}{' '}
                {new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1).getFullYear()}
              </span>
            </div>

            <button
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Two-month grid */}
          <div className="flex gap-8">
            {renderMonth(0)}
            <div className="hidden lg:block w-[1px] bg-slate-100 self-stretch" />
            <div className="hidden lg:flex flex-1">
              {renderMonth(1)}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 pt-4 border-t border-slate-100 gap-3 sm:gap-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFlexible}
                onChange={(e) => onFlexibleChange(e.target.checked)}
                className="w-4 h-4 rounded accent-tarco-blue cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-600">
                {t.booking?.flexibleDates || "My dates are flexible"}
              </span>
            </label>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { onDepartureChange(null); onReturnChange(null); }}
                className="text-sm font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {t.booking?.clearAll || "Clear all"}
              </button>
              <button
                onClick={onClose}
                className="bg-tarco-red hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-100 transition-colors"
              >
                {t.booking?.continueTo || "Continue"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
