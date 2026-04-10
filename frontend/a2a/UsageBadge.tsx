import React from "react";
import { Zap } from "lucide-react";

interface UsageBadgeProps {
  remaining: number;
  max: number;
  featureName: string;
}

export const UsageBadge: React.FC<UsageBadgeProps> = ({
  remaining,
  max,
  featureName,
}) => {
  const percentage = (remaining / max) * 100;
  const isLow = remaining === 0;
  const isWarning = remaining === 1;

  return <div></div>;
};
