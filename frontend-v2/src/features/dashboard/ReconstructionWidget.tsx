import { Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DashboardReconstructionData } from "@/api/dashboard";

interface Props {
  data: DashboardReconstructionData;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Čeká",
  approved: "Schváleno",
};

const CATEGORY_ICON_SRC: Record<string, string> = {
  task: "/icons/task.svg",
  idea: "/icons/bulp.svg",
  company: "/icons/company.svg",
};

export function ReconstructionWidget({ data }: Props) {
  const navigate = useNavigate();

  const header = (
    <div className="dashboard-card-header">
      <span className="dashboard-card-header-title">Údržba</span>
      <a
        href="/reconstruction"
        className="dashboard-card-header-link"
        onClick={(e) => { e.preventDefault(); navigate("/reconstruction"); }}
      >
        Vše →
      </a>
    </div>
  );

  if (data.totalActiveCount === 0) {
    return (
      <div className="glass-card reconstruction-card-empty">
        <div className="card-body-full">
          <div className="reconstruction-empty-row">
            <Wrench size={16} className="reconstruction-empty-icon" />
            <span className="reconstruction-empty-text">Údržba — žádné otevřené úkoly</span>
            <a href="/reconstruction" className="reconstruction-empty-cta" onClick={(e) => { e.preventDefault(); navigate("/reconstruction"); }}>
              Přidat →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="card-body-full">
        {header}
        <div className="reconstruction-widget-count">
          <span className="reconstruction-count-number">{data.totalActiveCount}</span>
          <span className="reconstruction-count-label">
            {data.totalActiveCount === 1 ? "otevřený úkol" : data.totalActiveCount < 5 ? "otevřené úkoly" : "otevřených úkolů"}
          </span>
        </div>
        <div className="reconstruction-widget-list">
          {data.items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="reconstruction-widget-item"
              onClick={() => navigate("/reconstruction")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") navigate("/reconstruction"); }}
            >
              <span className="reconstruction-item-icon">
                {CATEGORY_ICON_SRC[item.category] ? (
                  <img src={CATEGORY_ICON_SRC[item.category]} alt="" width={18} height={18} />
                ) : "•"}
              </span>
              <div className="reconstruction-item-info">
                <span className="reconstruction-item-title">{item.title}</span>
                <span className="reconstruction-item-meta">
                  {STATUS_LABELS[item.status] ?? item.status}
                  {item.votesCount > 0 && ` · ${item.votesCount} hlas${item.votesCount === 1 ? '' : item.votesCount < 5 ? 'y' : '\u016F'}`}
                  {item.deadline && ` · do ${item.deadline}`}
                </span>
              </div>
            </div>
          ))}
        </div>
        {data.totalActiveCount > data.items.length && (
          <a
            href="/reconstruction"
            className="shopping-widget-more"
            onClick={(e) => { e.preventDefault(); navigate("/reconstruction"); }}
          >
            + {data.totalActiveCount - data.items.length} dalších →
          </a>
        )}
      </div>
    </div>
  );
}
