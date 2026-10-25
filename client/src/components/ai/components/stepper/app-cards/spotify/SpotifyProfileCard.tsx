// get_profile: picture, name, email, plan, followers and country.
import { Users } from 'lucide-react';
import { AppCard, Pill, Thumb } from '../shared';
import { SpotifyPlanBadge } from './SpotifyPlanBadge';
import { SpotifyOpenButton } from './SpotifyOpenButton';

export function SpotifyProfileCard({ data }: { args: any; data: any }) {
  return (
    <AppCard brand="spotify" title="Spotify account">
      <div className="flex items-center gap-3">
        <Thumb src={data.image} alt={data.name} className="h-14 w-14 shrink-0" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{data.name}</div>
          <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] truncate">{data.email}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <SpotifyPlanBadge plan={data.plan} />
            {typeof data.followers === 'number' && <Pill><Users className="h-3 w-3" />{data.followers} followers</Pill>}
            {data.country && <Pill>{data.country}</Pill>}
          </div>
        </div>
      </div>
      {data.url && <div className="mt-3"><SpotifyOpenButton href={data.url}>Open profile</SpotifyOpenButton></div>}
    </AppCard>
  );
}
