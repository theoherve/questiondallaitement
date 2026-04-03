"use client";

import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
  type LucideIcon,
} from "lucide-react";

export const navIconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
};

export const getNavIcon = (iconKey: string): LucideIcon =>
  navIconMap[iconKey] ?? LayoutDashboard;
