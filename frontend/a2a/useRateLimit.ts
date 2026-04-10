import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

// Features that can be rate limited
export type RateLimitedFeature =
  | "summarization"
  | "legal_query"
  | "draft_generation"
  | "legal_research"
  | "lawyer_matching"
  | "diary";

export interface FeatureUsage {
  summarization: number;
  legal_query: number;
  draft_generation: number;
  legal_research: number;
  lawyer_matching: number;
  diary: number;
}

const FEATURE_NAMES: Record<RateLimitedFeature, string> = {
  summarization: "Document Summarization",
  legal_query: "Legal Query",
  draft_generation: "Draft Generation",
  legal_research: "Legal Research",
  lawyer_matching: "Lawyer Matching",
  diary: "Advocate Diary",
};

// Maximum uses per feature for public testing
const MAX_USAGE_PER_FEATURE = 25;

// Get the feature usage object from user metadata
const getFeatureUsage = (user: any): FeatureUsage => {
  return (
    user?.user_metadata?.feature_usage || {
      summarization: 0,
      legal_query: 0,
      draft_generation: 0,
      legal_research: 0,
      lawyer_matching: 0,
      diary: 0,
    }
  );
};

export const useRateLimit = (feature: RateLimitedFeature) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to use this feature.");
      return false;
    }

    // Always fetch fresh session to ensure metadata is up to date
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = session?.user || user;
    const featureUsage = getFeatureUsage(currentUser);
    const currentUsage = featureUsage[feature] || 0;

    if (currentUsage >= MAX_USAGE_PER_FEATURE) {
      toast.error(
        `Rate Limit Exceeded: You have used all ${MAX_USAGE_PER_FEATURE} free attempts for ${FEATURE_NAMES[feature]}.`,
      );
      return false;
    }

    return true;
  }, [user, feature]);

  const incrementUsage = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || user;
      const featureUsage = getFeatureUsage(currentUser);

      // Increment usage for the specific feature
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;

      const { error } = await supabase.auth.updateUser({
        data: { feature_usage: featureUsage },
      });

      if (error) {
        console.error("Failed to update rate limit:", error);
      }
    } catch (err) {
      console.error("Rate limit increment error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, feature]);

  const featureUsage = getFeatureUsage(user);
  const remainingUses = Math.max(
    0,
    MAX_USAGE_PER_FEATURE - (featureUsage[feature] || 0),
  );

  return {
    checkRateLimit,
    incrementUsage,
    loading,
    remainingUses,
    maxUses: MAX_USAGE_PER_FEATURE,
    featureName: FEATURE_NAMES[feature],
    featureUsage,
  };
};

// Hook to get all feature usage (for displaying to user)
export const useFeatureUsage = () => {
  const { user } = useAuth();

  const featureUsage = getFeatureUsage(user);

  const resetAllUsage = async () => {
    if (!user) return;
    const resetUsage: FeatureUsage = {
      summarization: 0,
      legal_query: 0,
      draft_generation: 0,
      legal_research: 0,
      lawyer_matching: 0,
      diary: 0,
    };
    await supabase.auth.updateUser({
      data: { feature_usage: resetUsage },
    });
    // Refresh session so UI picks up the change
    await supabase.auth.refreshSession();
  };

  return {
    resetAllUsage,
    summarization: {
      used: featureUsage.summarization || 0,
      remaining: Math.max(
        0,
        MAX_USAGE_PER_FEATURE - (featureUsage.summarization || 0),
      ),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.summarization,
    },
    legal_query: {
      used: featureUsage.legal_query || 0,
      remaining: Math.max(
        0,
        MAX_USAGE_PER_FEATURE - (featureUsage.legal_query || 0),
      ),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.legal_query,
    },
    draft_generation: {
      used: featureUsage.draft_generation || 0,
      remaining: Math.max(
        0,
        MAX_USAGE_PER_FEATURE - (featureUsage.draft_generation || 0),
      ),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.draft_generation,
    },
    legal_research: {
      used: featureUsage.legal_research || 0,
      remaining: Math.max(
        0,
        MAX_USAGE_PER_FEATURE - (featureUsage.legal_research || 0),
      ),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.legal_research,
    },
    lawyer_matching: {
      used: featureUsage.lawyer_matching || 0,
      remaining: Math.max(
        0,
        MAX_USAGE_PER_FEATURE - (featureUsage.lawyer_matching || 0),
      ),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.lawyer_matching,
    },
    diary: {
      used: featureUsage.diary || 0,
      remaining: Math.max(0, MAX_USAGE_PER_FEATURE - (featureUsage.diary || 0)),
      max: MAX_USAGE_PER_FEATURE,
      name: FEATURE_NAMES.diary,
    },
  };
};
