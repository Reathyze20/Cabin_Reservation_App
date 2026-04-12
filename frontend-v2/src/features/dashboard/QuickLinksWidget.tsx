import { useNavigate } from "react-router-dom";
import type { DashboardGalleryData, DashboardNotesData } from "@/api/dashboard";
import { Camera, MessageCircle, BookOpen } from "lucide-react";

interface Props {
  gallery: DashboardGalleryData | null;
  notes: DashboardNotesData["latestNotes"] | null;
}

export function QuickLinksWidget({ gallery, notes }: Props) {
  const navigate = useNavigate();

  const lastPhoto = gallery?.photos?.[0];
  const lastNote = notes?.[0];
  const noteCount = notes?.length ?? 0;
  const photoCount = gallery?.photos?.length ?? 0;

  return (
    <div className="glass-card">
      <div className="card-body-full">
        <div className="dashboard-card-header">
          <span className="dashboard-card-header-title">Rychlý přehled</span>
        </div>

        <div className="quick-links-list">
          {/* Gallery link */}
          <button
            className="quick-link-item"
            onClick={() => navigate("/gallery")}
            type="button"
          >
            <div className="quick-link-icon quick-link-icon--gallery">
              {lastPhoto ? (
                <img src={lastPhoto.thumb} alt="" className="quick-link-thumb" />
              ) : (
                <Camera size={20} />
              )}
            </div>
            <div className="quick-link-info">
              <span className="quick-link-label">Galerie</span>
              <span className="quick-link-meta">
                {photoCount > 0
                  ? `${photoCount} nových fotek`
                  : "Zatím žádné fotky"
                }
              </span>
            </div>
            <span className="quick-link-arrow">→</span>
          </button>

          {/* Chat link */}
          <button
            className="quick-link-item"
            onClick={() => navigate("/notes")}
            type="button"
          >
            <div className="quick-link-icon quick-link-icon--chat">
              <MessageCircle size={20} />
            </div>
            <div className="quick-link-info">
              <span className="quick-link-label">Chat</span>
              <span className="quick-link-meta">
                {noteCount > 0 && lastNote
                  ? `${lastNote.username}: ${lastNote.message.length > 35 ? lastNote.message.slice(0, 35) + "…" : lastNote.message}`
                  : "Žádné nové zprávy"
                }
              </span>
            </div>
            {noteCount > 0 && (
              <span className="quick-link-badge">{noteCount}</span>
            )}
            <span className="quick-link-arrow">→</span>
          </button>

          {/* Diary link */}
          <button
            className="quick-link-item"
            onClick={() => navigate("/diary")}
            type="button"
          >
            <div className="quick-link-icon quick-link-icon--diary">
              <BookOpen size={20} />
            </div>
            <div className="quick-link-info">
              <span className="quick-link-label">Deník</span>
              <span className="quick-link-meta">Zápisky z pobytů</span>
            </div>
            <span className="quick-link-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
