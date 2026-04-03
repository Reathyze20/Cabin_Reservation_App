import styles from "../Reservations.module.css";

export function ReservationsSkeleton() {
  return (
    <div className={styles.layout}>
      {/* Left: Calendar skeleton */}
      <div className={styles.skeletonCalendarCard}>
        <div className={styles.skeletonHeaderBar}>
          <div className={styles.skeletonNavBlock} />
          <div className={styles.skeletonStatsBlock}>
            <div className={styles.skeletonStatPill} />
            <div className={styles.skeletonStatPill} />
            <div className={styles.skeletonStatPill} />
          </div>
        </div>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className={styles.skeletonCell} />
          ))}
        </div>
      </div>

      {/* Right: List skeleton */}
      <div>
        <div className={styles.skeletonNavBlock} style={{ marginBottom: "var(--space-lg)" }} />
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={styles.skeletonListCard}
            style={{ marginBottom: "var(--space-sm)" }}
          />
        ))}
      </div>
    </div>
  );
}
