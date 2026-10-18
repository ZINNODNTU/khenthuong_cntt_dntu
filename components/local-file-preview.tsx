"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import styles from "./local-file-preview.module.css";

export function LocalFilePreview({ file, onClose }: { file: File; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const src = URL.createObjectURL(file);
    const oldFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setUrl(src);
    closeButton.current?.focus();
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        // The dialog only exposes one interactive control.
        event.preventDefault();
        closeButton.current?.focus();
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
      URL.revokeObjectURL(src);
      oldFocus?.focus();
    };
  }, [file, onClose]);
  return <div className={styles.backdrop} role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="local-preview-title">
      <header>
        <div><strong id="local-preview-title">{file.name}</strong><span>Xem trước tệp trên thiết bị — chưa tải lên Google Drive</span></div>
        <button ref={closeButton} aria-label="Đóng xem trước" type="button" onClick={onClose}><X size={20}/></button>
      </header>
      <div className={styles.body}>
        {url && file.type === "application/pdf" && <iframe title={`Xem trước PDF ${file.name}`} src={url} />}
        {url && file.type.startsWith("image/") && <img src={url} alt={`Xem trước minh chứng ${file.name}`} />}
        {url && !["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type) &&
          <div className={styles.unsupported}><FileText size={29}/><p>Định dạng không hỗ trợ xem trước.</p></div>}
      </div>
    </div>
  </div>;
}
