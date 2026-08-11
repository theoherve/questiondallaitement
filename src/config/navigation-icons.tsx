"use client";

import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  UserCog,
  ClipboardList,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
  Link2,
  Baby,
  type LucideIcon,
} from "lucide-react";

export const navIconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  UserCog,
  ClipboardList,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
  Link: Link2,
  Baby,
};

export const getNavIcon = (iconKey: string): LucideIcon =>
  navIconMap[iconKey] ?? LayoutDashboard;
