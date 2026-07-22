export default function DashboardLoading() {
    return (<div className="dashboard-loading" role="status" aria-live="polite">
      <div className="loading-line loading-line-wide"/>
      <div className="loading-grid">
        {Array.from({ length: 5 }, (_, index) => (<div className="loading-card" key={index}/>))}
      </div>
      <div className="loading-panel"/>
    </div>);
}

