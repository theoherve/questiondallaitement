"use client";

import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  Users,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  type LucideIcon,
} from "lucide-react";

export const navIconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  Users,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
};

export const getNavIcon = (iconKey: string): LucideIcon =>
  navIconMap[iconKey] ?? LayoutDashboard;
