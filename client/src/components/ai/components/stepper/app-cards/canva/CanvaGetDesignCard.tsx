// get_design: one design with its preview and Edit / View buttons
import React from 'react';
import { CanvaDesignCard } from './CanvaDesignCard';

// ─── Get design ───
export function CanvaGetDesignCard({ data }: { data: any }) {
  return data?.design ? <CanvaDesignCard design={data.design} label="Design" /> : null;
}
