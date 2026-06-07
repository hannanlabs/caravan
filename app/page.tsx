import { NationDashboard } from './NationDashboard';
import { fetchSnapshot, type InitialSnapshot } from '../lib/spacetimedb-server';

export default async function Home() {
  let initialSnapshot: InitialSnapshot = { world: null };

  try {
    initialSnapshot = await fetchSnapshot();
  } catch (error) {
    console.error('Failed to fetch initial snapshot:', error);
  }

  return <NationDashboard initialSnapshot={initialSnapshot} />;
}
