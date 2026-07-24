export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return <div className={`card ${padding ? "card-body" : ""} ${className}`.trim()}>{children}</div>;
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
