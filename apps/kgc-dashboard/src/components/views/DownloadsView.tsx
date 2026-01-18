export function DownloadsView() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Exportok és Riportok</h3>
        <p className="text-muted-foreground">A letöltések hamarosan elérhetőek lesznek.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ExportCard
          icon="📊"
          title="Sprint Riport"
          description="Aktuális sprint státusz export"
          format="PDF"
        />
        <ExportCard
          icon="📈"
          title="Haladás Export"
          description="Epic és story haladás adatok"
          format="CSV"
        />
        <ExportCard
          icon="🧪"
          title="Teszt Riport"
          description="Teszt eredmények és coverage"
          format="HTML"
        />
        <ExportCard
          icon="🔍"
          title="Review Összesítő"
          description="Code review eredmények"
          format="JSON"
        />
        <ExportCard
          icon="📋"
          title="Teljes Státusz"
          description="Minden adat egy fájlban"
          format="ZIP"
        />
        <ExportCard icon="🗂️" title="Archívum" description="Korábbi exportok" format="—" />
      </div>
    </div>
  );
}

function ExportCard({
  icon,
  title,
  description,
  format,
}: {
  icon: string;
  title: string;
  description: string;
  format: string;
}) {
  return (
    <button className="card text-left hover:ring-1 hover:ring-primary-500/50 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">{format}</span>
        <span className="text-xs text-primary-400">Letöltés →</span>
      </div>
    </button>
  );
}
