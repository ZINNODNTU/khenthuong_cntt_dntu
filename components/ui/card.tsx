export function Card({
  children,
  className = "",
  padding = true,
  hoverable = false,
  variant = "bordered",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hoverable?: boolean;
  variant?: "bordered" | "elevated" | "flat";
}) {
  const classes = [
    "card",
    padding ? "card-body" : "",
    hoverable ? "card-hover" : "",
    variant === "elevated" ? "shadow-md" : "",
    variant === "flat" ? "border-0 shadow-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card-header ${className}`.trim()}>{children}</div>;
}

export function CardSection({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card form-section">
      {(title || description || action) && (
        <div className="card-section-heading">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action && <div className="card-section-action">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
