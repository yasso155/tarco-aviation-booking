import React from 'react';
import { Calendar } from 'lucide-react';

interface HeroDatePickerProps {
  departureDate: Date | null;
  returnDate: Date | null;
  isRoundTrip: boolean;
  seamless?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  t: any;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatDate = (date: Date | null) => {
  if (!date) return "";
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].substring(0, 3)} ${date.getFullYear()}`;
};

/** Trigger-only component. The calendar panel is rendered
 *  separately in App.tsx as an inline block inside the booking card. */
export const HeroDatePicker: React.FC<HeroDatePickerProps> = ({
  departureDate,
  returnDate,
  isRoundTrip,
  seamless = false,
  isOpen = false,
  onToggle,
  t,
}) => {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center h-full cursor-pointer transition-all ${
        seamless
          ? `px-4 py-3 ${isOpen ? 'bg-blue-50/50' : 'hover:bg-slate-100/60'}`
          : 'bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-tarco-blue hover:bg-white'
      }`}
    >
      {!seamless && <Calendar size={20} className="text-tarco-blue flex-shrink-0 mr-3" />}
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5 whitespace-nowrap">
            {t.booking?.departure || "Departure"}
          </span>
          <span className={`font-semibold text-sm whitespace-nowrap ${departureDate ? 'text-slate-800' : 'text-slate-400'}`}>
            {departureDate ? formatDate(departureDate) : "Select date"}
          </span>
        </div>

        {isRoundTrip && (
          <>
            <div className="w-[1px] h-8 bg-slate-200 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5 whitespace-nowrap">
                {t.booking?.return || "Return"}
              </span>
              <span className={`font-semibold text-sm whitespace-nowrap ${returnDate ? 'text-slate-800' : 'text-slate-400'}`}>
                {returnDate ? formatDate(returnDate) : "Select date"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
