import { useNavigate } from "react-router-dom";

interface Props {
  warning: { count: number; items: { name: string }[] } | null;
}

export function EssentialWarning({ warning }: Props) {
  const navigate = useNavigate();

  if (!warning || warning.count === 0) return null;

  const itemNames = warning.items
    .slice(0, 5)
    .map((i) => i.name)
    .join(", ");
  const remaining = warning.items.length > 5 ? ` a ${warning.items.length - 5} dalších` : "";

  return (
    <div id="dashboard-essential-warning" className="essential-warning-banner">
      <div className="essential-warning-content">
        <div className="essential-warning-text">
          <span className="essential-warning-icon" />
          <div className="essential-warning-message-block">
            <span className="essential-warning-message">
              Na chatě chybí a čekají na dokoupení důležité položky:
            </span>
            <span className="essential-warning-items">
              {itemNames}
              {remaining}.
            </span>
          </div>
        </div>
        <button className="btn-alert" id="btn-go-shopping" onClick={() => navigate("/shopping")}>
          Otevřít nákupy
        </button>
      </div>
    </div>
  );
}
