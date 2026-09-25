import { Network } from 'lucide-react';
import { useNavigate } from 'react-router';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useVaultContext } from '@/features/vaults/VaultContext';
import { GraphView } from './GraphView';
import { useVaultGraph } from './useGraph';

export function GraphPage() {
  const { vault } = useVaultContext();
  const graph = useVaultGraph(vault.id);
  const navigate = useNavigate();

  if (graph.isPending) return <LoadingState />;
  if (graph.isError) return <ErrorState error={graph.error} />;
  if (graph.data.nodes.length === 0) {
    return <EmptyState icon={<Network />} title="Le graphe est vide">Créez des notes pour les voir apparaître ici.</EmptyState>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Graphe de « {vault.name} »</h1>
        <p className="text-sm text-muted-foreground">
          {graph.data.nodes.length} notes · {graph.data.edges.length} liens
          {graph.data.edges.length === 0 && ' — reliez des notes en écrivant [[Titre]]'}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <GraphView graph={graph.data} onNodeClick={(id) => navigate(`/vaults/${vault.id}/notes/${id}`)} />
      </div>
    </div>
  );
}
