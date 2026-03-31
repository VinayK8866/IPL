import { Metadata, ResolvingMetadata } from 'next';
import { MatchHub } from '@/components/dashboard/MatchHub';
import { VFXProvider } from '@/components/dashboard/vfx/VFXProvider';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  params: Promise<{ id: string }>
}

/**
 * PROJECT CRICKET PULSE - DYNAMIC SEO ENGINE
 * Generates real-time metadata for live matches to satisfy SEO pro-tip.
 */
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;
  
  // Fetch basic match details for SEO
  const { data: match } = await supabase
    .from('matches')
    .select('team_a, team_b, status')
    .eq('id', id)
    .single();

  const title = match 
    ? `${match.team_a} vs ${match.team_b} | LIVE Cricket Pulse Stream`
    : 'Live Cricket Analytics | Cricket Pulse';
    
  const description = `Watch the live 3D visualization and real-time analytics for ${match?.team_a || 'the match'} on Cricket Pulse. AI-driven insights, live wagon wheels, and zero-latency data.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.png'], // Placeholder for dynamic OG image
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  };
}

export default function MatchPage() {
  return (
    <VFXProvider>
      <MatchHub />
    </VFXProvider>
  );
}
