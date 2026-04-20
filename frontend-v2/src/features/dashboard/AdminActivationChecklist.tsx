import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, ShoppingCart, UserPlus } from "lucide-react";
import type { DashboardActivationData } from "@/api/dashboard";

interface Props {
  data: DashboardActivationData;
}

interface ActivationStep {
  id: "invite" | "reservation" | "shopping";
  title: string;
  description: string;
  detail: string;
  done: boolean;
  href: string;
  ctaLabel: string;
  icon: typeof UserPlus;
}

export function AdminActivationChecklist({ data }: Props) {
  const navigate = useNavigate();
  const additionalMembersCount = Math.max(0, data.membersCount - 1);

  const steps: ActivationStep[] = [
    {
      id: "invite",
      title: "Pozvěte prvního člena rodiny",
      description: "Pošlete první pozvánku, ať v aplikaci nejste sami a může začít společné plánování.",
      detail: additionalMembersCount > 0
        ? `Další připojení členové v chatě: ${additionalMembersCount}.`
        : data.activeInviteCount > 0
          ? `Aktivní pozvánky čekající na přijetí: ${data.activeInviteCount}.`
          : "Zatím jste v chatě sami a žádná aktivní pozvánka neběží.",
      done: additionalMembersCount > 0,
      href: additionalMembersCount > 0 ? "/admin" : "/admin/invites#admin-invites",
      ctaLabel: additionalMembersCount > 0 ? "Správa členů" : data.activeInviteCount > 0 ? "Zobrazit pozvánky" : "Pozvat člena",
      icon: UserPlus,
    },
    {
      id: "reservation",
      title: "Vytvořte první rezervaci",
      description: "Naplánujte první termín, aby bylo hned jasné, kdy se chata poprvé používá.",
      detail: data.reservationsCount > 0
        ? `Rezervace v systému: ${data.reservationsCount}.`
        : "První pobyt zatím nikdo nenaplánoval.",
      done: data.reservationsCount > 0,
      href: "/reservations",
      ctaLabel: data.reservationsCount > 0 ? "Otevřít rezervace" : "Naplánovat pobyt",
      icon: CalendarDays,
    },
    {
      id: "shopping",
      title: "Založte první nákupní seznam",
      description: "Připravte první sdílený seznam, ať rodina nemusí řešit zásoby po telefonu.",
      detail: data.shoppingListsCount > 0
        ? `Nákupní seznamy v systému: ${data.shoppingListsCount}.`
        : "Zatím neexistuje žádný běžný nákupní seznam.",
      done: data.shoppingListsCount > 0,
      href: "/shopping",
      ctaLabel: data.shoppingListsCount > 0 ? "Otevřít nákupy" : "Založit seznam",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="glass-card dashboard-activation-card" id="dashboard-activation-checklist">
      <div className="card-body-full dashboard-activation-content">
        <div className="dashboard-activation-head">
          <div className="dashboard-activation-copy">
            <span className="dashboard-card-header-title">První kroky pro správce</span>
            <h2 className="dashboard-activation-title">Připravte aplikaci pro první společné používání.</h2>
            <p className="dashboard-activation-lead">
              Jakmile dokončíte tyto tři kroky, nová chata bude připravená pro běžný rodinný provoz.
            </p>
          </div>

          <div className="dashboard-activation-progress" aria-label={`Hotovo ${data.completedCount} z ${data.totalCount} kroků`}>
            <strong>{data.completedCount}/{data.totalCount}</strong>
            <span>hotovo</span>
          </div>
        </div>

        <div className="dashboard-activation-steps">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <section key={step.id} className={`dashboard-activation-step ${step.done ? "is-done" : ""}`}>
                <div className="dashboard-activation-step-marker" aria-hidden="true">
                  {step.done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>

                <div className="dashboard-activation-step-copy">
                  <div className="dashboard-activation-step-top">
                    <h3>{step.title}</h3>
                    <span className={`dashboard-activation-step-status ${step.done ? "is-done" : "is-pending"}`}>
                      {step.done ? "Hotovo" : "Čeká"}
                    </span>
                  </div>

                  <p className="dashboard-activation-step-description">{step.description}</p>
                  <p className="dashboard-activation-step-meta">{step.detail}</p>
                </div>

                <button
                  type="button"
                  className={`btn ${step.done ? "btn-secondary" : "btn-primary"}`}
                  onClick={() => navigate(step.href)}
                >
                  <span>{step.ctaLabel}</span>
                  <ArrowRight size={16} />
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}