// "Premium" (green) or "Free"
import React from 'react';
import { Crown } from 'lucide-react';
import { SdBadge } from './SdBadge';

export function SdPlanTag({ plan }: { plan?: string }) {
  if (!plan) return null;
  return plan === 'premium' ? <SdBadge tone="green" icon={<Crown className="h-3 w-3" />}>Premium</SdBadge> : <SdBadge><span className="capitalize">{plan}</span></SdBadge>;
}
