export function ReconstructionSkeleton() {
  return (
    <div className="main-content-reconstruction">
      <div className="page-card reconstruction-card">
        <div className="reconstruction-header reconstruction-header--skeleton">
          <div className="reconstruction-header-left">
            <div className="skeleton reconstruction-skeleton-title" />
            <div className="skeleton reconstruction-skeleton-subtitle" />
          </div>
          <div className="reconstruction-summary">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="reconstruction-summary-pill reconstruction-summary-pill--skeleton">
                <div className="skeleton reconstruction-skeleton-pill-icon" />
                <div className="reconstruction-skeleton-pill-text">
                  <div className="skeleton reconstruction-skeleton-pill-label" />
                  <div className="skeleton reconstruction-skeleton-pill-value" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="budget-container reconstruction-budget-skeleton">
          <div className="budget-labels">
            <div className="skeleton reconstruction-skeleton-budget-label" />
            <div className="skeleton reconstruction-skeleton-budget-amount" />
          </div>
          <div className="skeleton reconstruction-skeleton-progress" />
          <div className="budget-details">
            <div className="skeleton reconstruction-skeleton-detail" />
            <div className="skeleton reconstruction-skeleton-detail reconstruction-skeleton-detail--short" />
          </div>
        </div>

        <div className="kanban-board reconstruction-board-skeleton">
          {Array.from({ length: 3 }).map((_, columnIndex) => (
            <div key={columnIndex} className="kanban-column reconstruction-column-skeleton">
              <div className="kanban-column-header reconstruction-column-header-skeleton">
                <div className="skeleton reconstruction-skeleton-icon" />
                <div className="skeleton reconstruction-skeleton-column-title" />
                <div className="skeleton reconstruction-skeleton-count" />
              </div>

              <div className="kanban-column-body reconstruction-column-body-skeleton">
                {Array.from({ length: 3 }).map((__, cardIndex) => (
                  <div key={cardIndex} className="skeleton-card reconstruction-item-skeleton">
                    <div className="skeleton skeleton-text long" />
                    <div className="skeleton skeleton-text medium" />
                    <div className="skeleton skeleton-text short" />
                    <div className="reconstruction-item-skeleton-footer">
                      <div className="skeleton reconstruction-skeleton-badge" />
                      <div className="skeleton reconstruction-skeleton-badge reconstruction-skeleton-badge--small" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}