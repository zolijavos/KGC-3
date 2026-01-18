export function KnowledgeView() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Dokumentáció</h3>
        <p className="text-muted-foreground">A tudásbázis hamarosan elérhető lesz.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DocCard icon="📖" title="ADR-ek" description="Architecture Decision Records" count={43} />
        <DocCard icon="📋" title="PRD" description="Product Requirements Document" count={1} />
        <DocCard
          icon="🏗️"
          title="Architektúra"
          description="Rendszer architektúra dokumentáció"
          count={1}
        />
        <DocCard
          icon="📦"
          title="Epic Definíciók"
          description="Epic és story leírások"
          count={33}
        />
      </div>
    </div>
  );
}

function DocCard({
  icon,
  title,
  description,
  count,
}: {
  icon: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="card hover:ring-1 hover:ring-primary-500/50 cursor-pointer transition-all">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <span className="text-sm font-medium text-primary-400">{count}</span>
      </div>
    </div>
  );
}
