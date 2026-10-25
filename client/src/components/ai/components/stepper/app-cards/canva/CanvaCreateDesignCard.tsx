// create_design: the new design, ready to open in Canva
import React from 'react';
import { CanvaDesignCard } from './CanvaDesignCard';

// ─── Create design ───
export function CanvaCreateDesignCard({ data }: { data: any }) {
  return data?.design ? <CanvaDesignCard design={data.design} label="New design created" /> : null;
}
