// A Canva job that failed, with Canva's own reason
import React from 'react';
import { FailLine } from '../shared';

// ─── Job failed ───
export function CanvaJobFailed({ what, job }: { what: string; job: any }) {
  return <FailLine brand="canva" text={`${what} failed: ${job?.error?.message || job?.error?.code || 'unknown error'}`} />;
}
