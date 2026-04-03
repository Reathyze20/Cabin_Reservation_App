import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import apiClient from "@/api/client";
import { showToast } from "@/lib/toast";
import type { PendingShoppingItem } from "@/api/dashboard";

interface Props {
  items: PendingShoppingItem[];
  totalCount: number;
}

export function ShoppingWidget({ items: initialItems, totalCount: initialTotal }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState(initialItems);
  const [localTotal, setLocalTotal] = useState(initialTotal);

  const toggleMutation = useMutation({
    mutationFn: async ({ listId, itemId, purchased }: { listId: string; itemId: string; purchased: boolean }) => {
      await apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, { purchased });
    },
    onError: () => {
      // Rollback: refetch dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showToast("Nepodařilo se aktualizovat položku", "error");
    },
  });

  const handleCheck = (item: PendingShoppingItem) => {
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
          <div className="empty-state-card">
            <span className="empty-state-icon" style={{ color: "var(--color-primary)", opacity: 0.7 }}>
              <i className="fas fa-circle-check fa-2x" />
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

  const shownItems = localItems.slice(0, 5);
  const remaining = localTotal - shownItems.length;

  return (
    <div className="glass-card">
      <div className="card-body-full" id="dashboard-shopping">
        {header}
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
                  ❗
                </span>
              )}
              <span className="shopping-item-name">{item.name}</span>
              <span className="shopping-item-list">{item.listName}</span>
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
