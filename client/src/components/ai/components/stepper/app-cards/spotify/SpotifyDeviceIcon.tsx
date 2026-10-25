// Device sign by type: phone, computer, speaker / TV, or a general speaker-screen sign.
import { MonitorSpeaker, Smartphone, Laptop, Speaker } from 'lucide-react';

export function SpotifyDeviceIcon({ type, className = 'h-4 w-4' }: { type?: string; className?: string }) {
  const Icon = /phone/i.test(type || '') ? Smartphone : /computer/i.test(type || '') ? Laptop : /speaker|tv|cast/i.test(type || '') ? Speaker : MonitorSpeaker;
  return <Icon className={className} />;
}
