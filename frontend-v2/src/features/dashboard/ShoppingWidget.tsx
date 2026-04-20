import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/client";
import { showToast } from "@/lib/toast";
import { CircleCheck, AlertTriangle } from "lucide-react";
import type { PendingShoppingItem } from "@/api/dashboard";
import { getNetworkAwareActionMessage } from "@/lib/networkError";

interface Props {
  items: PendingShoppingItem[];
  totalCount: number;
  totalItemsCount: number;
}

export function ShoppingWidget({ items: initialItems, totalCount: initialTotal, totalItemsCount }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState(initialItems);
  const [localTotal, setLocalTotal] = useState(initialTotal);
  const [actionError, setActionError] = useState<string | null>(null);
  const checkedIds = useRef(new Set<string>());

  // Sync local state when props change (after refetch), keeping optimistic removals
  useEffect(() => {
    setLocalItems(initialItems.filter((i) => !checkedIds.current.has(i.id)));
    setLocalTotal(initialTotal - checkedIds.current.size);
  }, [initialItems, initialTotal]);

  const toggleMutation = useMutation({
    mutationFn: async ({ listId, itemId, purchased }: { listId: string; itemId: string; purchased: boolean }) => {
      await apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, { purchased });
    },
    onSuccess: () => {
      setActionError(null);
      // Refetch so new items replace the checked-off ones
      queryClient.invalidateQueries({ queryKey: ["dashboard", "shopping"] });
    },
    onSettled: (_data, _error, variables) => {
      // Clean up tracked ID after server round-trip so next refetch is clean
      if (variables) checkedIds.current.delete(variables.itemId);
    },
    onError: (_err, variables) => {
      // Rollback: remove from checked set and refetch
      if (variables) checkedIds.current.delete(variables.itemId);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "shopping"] });
      setActionError(
        getNetworkAwareActionMessage(
          _err,
          "Položku se nepodařilo označit jako nakoupenou. Zkuste to znovu.",
          "Spojení vypadlo dřív, než se změna stihla uložit. Zkuste to znovu po obnovení připojení.",
        ),
      );
      showToast("Nepodařilo se aktualizovat položku", "error");
    },
  });

  const handleCheck = (item: PendingShoppingItem) => {
    setActionError(null);
    // Track checked ID so it stays hidden even after refetch arrives
    checkedIds.current.add(item.id);
    // Optimistic: remove from local list
    setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
    setLocalTotal((prev) => Math.max(0, prev - 1));
    toggleMutation.mutate({ listId: item.listId, itemId: item.id, purchased: true });
  };

  const header = (
    <div className="dashboard-card-header">
      <span className="dashboard-card-header-title">K nakoupení</span>
      <a
        href="/shopping"
        className="dashboard-card-header-link"
        onClick={(e) => { e.preventDefault(); navigate("/shopping"); }}
      >
        Seznamy →
      </a>
    </div>
  );

  if (localTotal === 0) {
    return (
      <div className="glass-card">
        <div className="card-body-full" id="dashboard-shopping">
          {header}
          {actionError ? (
            <div className="error-message show" role="alert">{actionError}</div>
          ) : null}
          <div className="empty-state-card">
            <span className="empty-state-icon" style={{ color: "var(--color-primary)", opacity: 0.7 }}>
              <CircleCheck size={32} />
            </span>
            <p className="empty-text">Na chatě nic nechybí!</p>
            <a href="/shopping" className="empty-cta" onClick={(e) => { e.preventDefault(); navigate("/shopping"); }}>
              Nový seznam
            </a>
          </div>
        </div>
      </div>
    );
  }

  const shownItems = localItems.slice(0, 6);
  const remaining = localTotal - shownItems.length;
  const purchasedCount = totalItemsCount - localTotal;
  const progressPct = totalItemsCount > 0 ? Math.round((purchasedCount / totalItemsCount) * 100) : 0;

  return (
    <div className="glass-card">
      <div className="card-body-full" id="dashboard-shopping">
        {header}
        {totalItemsCount > 0 && (
          <div className="shopping-progress-wrap">
            <div className="shopping-progress-bar">
              <div className="shopping-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="shopping-progress-label">{purchasedCount}/{totalItemsCount}</span>
          </div>
        )}
        {actionError ? (
          <div className="error-message show" role="alert">{actionError}</div>
        ) : null}
        <div className="list-content shopping-widget-list">
          {shownItems.map((item) => (
            <label key={item.id} className="dashboard-shopping-item">
              <input
                type="checkbox"
                className="shopping-item-check"
                onChange={() => handleCheck(item)}
              />
              {item.isEssential && (
                <span className="shopping-essential-mark" title="Nutné">
                  <AlertTriangle size={14} />
                </span>
              )}
              <span className="shopping-item-name">{item.name}</span>
              <span className="shopping-item-list" title={item.listName}>{item.listName}</span>
            </label>
          ))}
        </div>
        {remaining > 0 && (
          <a
            href="/shopping"
            className="shopping-widget-more"
            onClick={(e) => { e.preventDefault(); navigate("/shopping"); }}
          >
            + {remaining} dalších položek →
          </a>
        )}
      </div>
    </div>
  );
}
