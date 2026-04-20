import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, ShoppingCart, UserPlus } from "lucide-react";
import type { DashboardActivationData } from "@/api/dashboard";

interface Props {
  data: DashboardActivationData;
}

interface ActivationStep {
  id: "invite" | "reservation" | "shopping";
  label: string;
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
      label: "Pozvánky",
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
      label: "Rezervace",
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
      label: "Nákupy",
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

  const pendingSteps = steps.filter((step) => !step.done);
  const nextStep = pendingSteps[0] ?? null;
  const title = pendingSteps.length === 0
    ? "První rodinné spuštění je hotové."
    : pendingSteps.length === 1
      ? "Zbývá už jen poslední krok pro běžný provoz."
      : `Pro běžný provoz ještě zbývá dokončit ${pendingSteps.length} kroky.`;
  const lead = pendingSteps.length === 0
    ? "Všechno důležité je nastavené a dashboard může zůstat čistě přehledový."
    : `Na později nic nehoří, ale doporučujeme ještě dokončit: ${pendingSteps.map((step) => step.title).join(", ")}.`;

  return (
    <div className="glass-card dashboard-activation-inline-card" id="dashboard-activation-checklist">
      <div className="card-body-full dashboard-activation-inline-content">
        <div className="dashboard-activation-inline-main">
          <div className="dashboard-activation-inline-copy">
            <div className="dashboard-activation-inline-head">
              <div className="dashboard-activation-inline-text">
                <span className="dashboard-card-header-title">Poznámka pro správce</span>
                <h2 className="dashboard-activation-inline-title">{title}</h2>
              </div>

              <div className="dashboard-activation-progress" aria-label={`Hotovo ${data.completedCount} z ${data.totalCount} kroků`}>
                <strong>{data.completedCount}/{data.totalCount}</strong>
                <span>hotovo</span>
              </div>
            </div>

            <p className="dashboard-activation-inline-lead">{lead}</p>

            <div className="dashboard-activation-inline-tags">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <span
                    key={step.id}
                    className={`dashboard-activation-inline-tag ${step.done ? "is-done" : "is-pending"}`}
                    title={step.done ? step.detail : `${step.description} ${step.detail}`}
                  >
                    <span className="dashboard-activation-inline-tag-icon" aria-hidden="true">
                      {step.done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                    </span>
                    <span>{step.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {nextStep ? (
            <button
              type="button"
              className="btn btn-secondary dashboard-activation-inline-action"
              onClick={() => navigate(nextStep.href)}
            >
              <span>{nextStep.ctaLabel}</span>
              <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}