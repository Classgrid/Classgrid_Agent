// If one display part breaks, it disappears instead of breaking the chat
import React from 'react';

export class SdBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[Spotify display] part failed', err); }
  render() { return this.state.failed ? null : this.props.children; }
}
