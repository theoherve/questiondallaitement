"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { getConsultantAvailableDays, getAvailableSlots } from "../actions";

type StepCalendarProps = {
  consultantId: string;
  consultationTypeId: string;
  durationMinutes?: number;
  onSelect: (slot: { start: string; end: string; label: string }) => void;
};

type SlotData = { start: string; end: string; label: string };

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const StepCalendar = ({
  consultantId,
  consultationTypeId,
  durationMinutes,
  onSelect,
}: StepCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    const load = async () => {
      setIsLoadingDays(true);
      const days = await getConsultantAvailableDays(consultantId, monthStr);
      setAvailableDays(days);
      setIsLoadingDays(false);
    };
    load();
  }, [consultantId, monthStr]);

  const handleDateClick = useCallback(
    async (date: Date) => {
      setSelectedDate(date);
      setIsLoadingSlots(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const result = await getAvailableSlots(
        consultantId,
        consultationTypeId,
        dateStr,
        durationMinutes
      );
      setSlots(result);
      setIsLoadingSlots(false);
    },
    [consultantId, consultationTypeId, durationMinutes]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = ((getDay(monthStart) + 6) % 7);
  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-semibold text-primary-green">
        Choisissez votre créneau
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium capitalize text-primary-green">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}

            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isAvailable = availableDays.includes(dateStr);
              const isPast = isBefore(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDisabled = isPast || !isAvailable || isLoadingDays;

              return (
                <button
                  key={dateStr}
                  type="button"
                  data-testid="step-calendar-day"
                  data-date={dateStr}
                  data-available={!isDisabled}
                  disabled={isDisabled}
                  onClick={() => handleDateClick(day)}
                  className={`rounded-lg py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
                    isSelected
                      ? "bg-primary-red font-bold text-white"
                      : isDisabled
                        ? "cursor-not-allowed text-muted-foreground/30"
                        : "cursor-pointer font-medium text-primary-green hover:bg-primary-red/10"
                  }`}
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label={format(day, "EEEE d MMMM", { locale: fr })}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          {!selectedDate && (
            <p className="py-12 text-center text-muted-foreground">
              Sélectionnez une date pour voir les créneaux disponibles.
            </p>
          )}

          {selectedDate && isLoadingSlots && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-green/50" />
            </div>
          )}

          {selectedDate && !isLoadingSlots && (
            <div>
              <p className="mb-3 text-sm font-medium text-primary-green">
                {format(selectedDate, "EEEE d MMMM", { locale: fr })}
              </p>
              {slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      data-testid="step-calendar-slot"
                      data-slot-start={slot.start}
                      onClick={() => onSelect(slot)}
                      className="cursor-pointer rounded-lg border-2 border-muted px-3 py-2 text-sm font-medium text-primary-green transition-all hover:border-primary-red hover:bg-primary-red/5 focus:outline-none focus:ring-2 focus:ring-primary-red/50"
                      tabIndex={0}
                      aria-label={`Créneau à ${slot.label}`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Aucun créneau disponible ce jour.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
