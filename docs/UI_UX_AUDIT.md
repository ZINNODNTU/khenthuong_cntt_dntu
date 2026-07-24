# UI/UX Audit Report — CNTT DNTU Award Review System

> Generated: 2026-07-23

## 1. Project Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| UI Library | React | 19.2.7 |
| Styling | Vanilla CSS (2 files) | — |
| Icons | lucide-react | 1.25.0 |
| Auth | Supabase SSR (@supabase/ssr + @supabase/supabase-js) | 0.12.3 / 2.110.7 |
| Validation | zod | 4.4.3 |
| Dates | date-fns | 4.1.0 |
| Utils | clsx | 2.1.1 |
| Package Manager | pnpm | 10.34.5 |

No component library (shadcn/ui, Radix, etc.) used. Pure CSS components.

## 2. Route Inventory

### Auth Routes (`/app/(auth)`)
| Route | Description | Status |
|-------|-------------|--------|
| `/login` | Login page | Loads `LoginScreen` + `LoginForm` |
| `/register` | Registration | Uses `RegisterForm` |
| `/configuration` | System config view | Standalone page |

### Dashboard Routes (`/app/(dashboard)`)
| Route | View | Role(s) | States Present |
|-------|------|---------|----------------|
| `/dashboard` | Admin KPI dashboard | admin | None (empty/loading/error) |
| `/applications` | Application list table | admin, submitter | Empty state via table cell |
| `/applications/new` | New application form | submitter | Periods check (empty) |
| `/applications/[id]` | Application detail | all | notFound |
| `/applications/[id]/supplement` | Supplement evidence | submitter | - |
| `/review` | Review queue list | admin, reviewer | Empty state via table cell |
| `/review/[id]` | Review detail + decision | admin, reviewer | notFound |
| `/results` | Results list | admin, reviewer | Empty state via table cell |
| `/branches` | Branch management | admin | - |
| `/clubs` | Club management | admin | - |
| `/periods` | Period management | admin | Empty state via table cell |
| `/admin/users` | User management | admin | - |
| `/settings` | System configuration | admin | 2-column grid |

### Error / System Routes
| Route | Description |
|-------|-------------|
| `/401` | Unauthorized |
| `/403` | Forbidden (inactive/role/student-email) |
| `/500` | Server error |
| `/change-password` | Force password change |
| `/not-found` | 404 |
| `/error` | React error boundary |
| `/global-error` | Root error boundary |

## 3. Layout Structure

```
RootLayout (html[lang=vi], globals.css + modern-ui.css)
├── (auth)/layout.tsx → renders children directly
└── (dashboard)/layout.tsx → AppShell wrapper
    └── AppShell (sidebar + topbar + content + help panel)
```

- **Root layout**: Loads 2 CSS files, no font import (uses system stack)
- **Dashboard layout**: Server component, fetches profile + branch count, renders `AppShell`
- **Auth layout**: No wrapper, renders page directly

## 4. Component Inventory

All components are flat in `/components/` — no subdirectory organization.

### Reusable UI Components
| Component | Lines | Notes |
|-----------|-------|-------|
| `status-badge.tsx` | 6 | Minimal, uses CSS classes |
| `stat-card.tsx` | 9 | KPI card |
| `brand-logo.tsx` | 12 | Logo wrapper |
| `sign-out-button.tsx` | 16 | Sign out |
| `evidence-gallery.tsx` | 22 | Image grid display |

### Complex / Page Components
| Component | Lines | Concerns |
|-----------|-------|----------|
| `app-shell.tsx` | 603 | Contains sidebar + topbar + help panel + all nav logic |
| `application-form.tsx` | 165 | Very dense, mixed concerns (upload + validation + navigation) |
| `user-manager.tsx` | 300 | Table + form + password reset modal |
| `branch-manager.tsx` | 235 | Mixed form + table + credential display |
| `period-manager.tsx` | 39 | Dense single-line formatting |
| `review-panel.tsx` | 26 | Decision buttons + comment |
| `supplement-form.tsx` | 81 | Upload + update |
| `application-detail.tsx` | 26 | Very dense, multiple sections crammed |

### Missing Shared Components
- **Button** — no standardized Button component, uses CSS classes `.btn`, `.btn.primary`, etc.
- **Input** — no standardized Input component
- **Select** — no standardized Select component
- **Textarea** — no standardized Textarea component
- **Card** — no standardized Card (uses `.card` CSS)
- **Table** — no standardized Table component
- **Modal/Dialog** — manual implementation in `user-manager.tsx` and `branch-manager.tsx`
- **Tabs** — not implemented
- **Breadcrumb** — inline in app-shell
- **Pagination** — not implemented
- **Skeleton** — CSS-only in globals.css
- **Toast** — not implemented
- **Empty State** — inline in each page
- **Error State** — inline in each page
- **Filter Bar** — manual `form.filters` CSS
- **Confirm Dialog** — not implemented

## 5. CSS Architecture Audit

### Files
- `app/globals.css` — 544 lines, 32030 bytes — **ALL** styles (minified-like, hard to maintain)
- `app/modern-ui.css` — 33136 bytes — **duplicate/overriding** styles

### Design Tokens (Current)
```css
:root {
  --navy: #0f172a;
  --navy2: #1e293b;
  --blue: #2563eb;
  --blue2: #1d4ed8;
  --cyan: #0891b2;
  --bg: #f8fafc;
  --surface: #fff;
  --soft: #f1f5f9;
  --line: #e2e8f0;
  --text: #0f172a;
  --muted: #64748b;
  --green: #15803d;
  --amber: #b45309;
  --red: #b91c1c;
  --shadow: 0 4px 12px rgba(15,23,42,.04);
  --radius: 10px;
}
```

### Token Issues
- `--radius: 10px` — target is 6px (input/button) / 8px (card/modal)
- Extra color `--cyan: #0891b2` not in new design system
- `--green`, `--amber`, `--red` — values don't match target (target: #166534, #92400E, #991B1B)
- Status success/warning/error text+bg colors hardcoded in CSS classes
- No typography scale tokens
- No spacing scale tokens

### CSS Anti-patterns Found
1. **Two sidebar implementations** coexist: `.sidebar` (old) and `.workspace-sidebar` (new)
2. **Login page uses gradients** (`.login-hero` background with radial gradient) — not allowed
3. **Dashboard uses gradient** in progress bars (`.progress i`)
4. **Glassmorphism** used in topbar (`.topbar` with backdrop-filter)
5. **Shadow used** throughout (`.card`, `.workspace-sidebar`, `.system-error-card`)
6. **Border radius inconsistencies**: 10px, 11px, 12px, 13px, 14px, 18px, 24px, 28px, 999px
7. **Font weight inconsistencies**: 600, 650, 700, 780, 800, 850, 900, 950, 1000
8. **Hardcoded colors** throughout (over 50+ unique hex values)
9. **No responsive strategy** for many elements
10. **Modern-ui.css** appears to be duplicate/overriding modern styles

## 6. Responsive Issues

| Page/Component | Desktop | Tablet (~768) | Mobile (~390) |
|----------------|---------|---------------|---------------|
| Sidebar | ✅ Fixed 294px | ✅ Drawer <900px | ❌ 88vw may be too wide |
| Dashboard stats | ✅ 5 columns | ✅ 3 columns (1240px) / 2 columns (820px) | ⚠️ Stacking ok |
| Table columns | ❌ Min-width 840px forces scroll | ❌ Same | ❌ Same — but scroll is acceptable |
| Form layout | ✅ 2 columns | ✅ 1 column | ✅ 1 column |
| Login page | ✅ 2 columns | ❌ Hero hidden at 820px | ❌ Hero hidden |
| Topbar | ✅ Full | ❌ User info hidden | ❌ Buttons become icon-only |
| Branch grid | ✅ 4 columns | ✅ 3 columns / 2 columns | ❌ Single column would be better |

## 7. Accessibility Issues

1. **No skip link** in old layout (AppShell has one — good)
2. **No focus ring** visible on interactive elements
3. **Color-only status indicators** — status badges rely on color alone
4. **No `aria-required`** on form fields
5. **No `aria-describedby`** linking help text to inputs
6. **Modal focus trap** — not implemented in manual dialogs
7. **No keyboard navigation** for dropdowns/menus
8. **Small touch targets** (some buttons < 42px)
9. **No `role` attributes** for dynamic content regions
10. **Contrast** may be insufficient (e.g., `#64748B` on `#F8FAFC`)

## 8. Performance Issues

1. **CSS file size** — 32KB+ globals.css with unused styles
2. **No CSS splitting** by route
3. **All icons imported** individually per component (good)
4. **No lazy loading** for images/evidence
5. **No React.lazy** for code splitting
6. **Large component files** with nested inline functions (re-created each render)

## 9. Duplicate / Inconsistent Patterns

- **Modals**: 2 different implementations (user-manager dialog, branch-manager credential card)
- **Forms**: Mix of regular `<form>` and inline state management
- **Tables**: 6 different table implementations with similar but not identical markup
- **Status colors**: Defined in CSS classes (`status-draft`, `status-passed`, etc.) but also referenced in JS
- **Page headers**: Each page defines its own eyebrow + title + description HTML
- **Filter bars**: Inline `<form>` elements with different markup per page
- **Empty states**: Inline `<div className="empty">` per table
- **Loading states**: Only root/dashboard loading defined; individual pages have none
- **Error states**: Pages throw to Next.js error boundary; no per-page error handling

## 10. Role-based UI Issues

- **Admin**: Full sidebar (dashboard, applications, review, results, periods, branches, clubs, users, settings)
- **Reviewer**: Limited sidebar (review, results only) — correct
- **Submitter**: Limited sidebar (applications, applications/new) — correct
- **Dashboard**: Only accessible to admin — correct
- **Missing**: Reviewer sees "Kết quả xét duyệt" with all results including other reviewers' decisions — expected behavior per docs

## 11. Immediate Action Items

1. Consolidate 2 CSS files into 1
2. Remove unused CSS (old `.sidebar`, `.app-shell`, `.login-shell`, etc.)
3. Normalize design tokens (colors, spacing, radius, typography)
4. Create shared UI components (Button, Input, Select, etc.)
5. Add missing states (loading, empty, error) to every page
6. Standardize table markup
7. Standardize form markup
8. Redesign login page without gradients
9. Redesign dashboard without gradients
10. Implement responsive breakpoints consistently
