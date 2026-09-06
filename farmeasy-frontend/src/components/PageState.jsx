import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

const icons = { loading: LoaderCircle, error: AlertTriangle, empty: Inbox };

export default function PageState({ type = "empty", title, description, actionLabel, onAction }) {
  const Icon = icons[type] || Inbox;
  return (
    <div className="page-state" role={type === "error" ? "alert" : "status"} aria-live="polite">
      <div className="page-state__content">
        <Icon className={`page-state__icon ${type === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {actionLabel && onAction && <button className="secondary-button" type="button" onClick={onAction}>{actionLabel}</button>}
      </div>
    </div>
  );
}
