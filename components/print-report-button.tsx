"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return (
    <button type="button" className="btn btn-primary report-hide-print" onClick={() => window.print()}>
      <Printer size={16} /> In / lưu PDF
    </button>
  );
}
