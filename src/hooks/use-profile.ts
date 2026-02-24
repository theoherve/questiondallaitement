"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const data = (await res.json()) as Profile;
      setProfile(data);
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  return { profile, isLoading };
};
