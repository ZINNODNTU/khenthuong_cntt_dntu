# UI/UX Redesign Plan — CNTT DNTU Award Review System

> Version: 1.0 | Status: Draft

## 1. Mục tiêu

Chuyển đổi toàn bộ giao diện frontend thành hệ thống quản trị doanh nghiệp hiện đại, thống nhất, đáp ứng các yêu cầu về thiết kế, accessibility, responsive và hiệu năng.

## 2. Danh sách màn hình

| # | Route | Màn hình | Role | Ghi chú |
|---|-------|----------|------|---------|
| 1 | `/login` | Đăng nhập | Public | Golden screen |
| 2 | `/register` | Đăng ký | Public | |
| 3 | `/change-password` | Đổi mật khẩu | All | |
| 4 | `/401` | Unauthorized | Public | |
| 5 | `/403` | Forbidden | Public | 3 variants |
| 6 | `/500` | Server error | Public | |
| 7 | `/not-found` | 404 | Public | |
| 8 | `/error` | Error boundary | All | |
| 9 | `/global-error` | Root error | All | |
| 10 | `/dashboard` | Tổng quan | Admin | Golden screen |
| 11 | `/applications` | DS hồ sơ | Admin + Submitter | Golden screen |
| 12 | `/applications/new` | Tạo hồ sơ | Submitter | Golden screen |
| 13 | `/applications/[id]` | Chi tiết hồ sơ | All | Golden screen |
| 14 | `/applications/[id]/supplement` | Bổ sung | Submitter | |
| 15 | `/review` | DS chờ duyệt | Admin + Reviewer | |
| 16 | `/review/[id]` | Duyệt hồ sơ | Admin + Reviewer | |
| 17 | `/results` | Kết quả | Admin + Reviewer | |
| 18 | `/branches` | Quản lý Chi đoàn | Admin | |
| 19 | `/clubs` | Quản lý CLB | Admin | |
| 20 | `/periods` | Đợt xét | Admin | |
| 21 | `/admin/users` | Tài khoản | Admin | |
| 22 | `/settings` | Cấu hình | Admin | |
| 23 | `/configuration` | Cấu hình auth | Public | |

## 3. Cấu trúc Layout mới

```
RootLayout
├── Inter font (Google Fonts)
├── globals.css (consolidated, tokens only)
└── body
    ├── (auth)/layout.tsx → no sidebar, centered layout
    └── (dashboard)/layout.tsx → AppShell
        ├── Sidebar (collapsible, role-based)
        ├── Topbar (breadcrumb + actions)
        └── Content area
            ├── PageHeader (title + description + actions)
            ├── FilterBar (when needed)
            └── Children (page content)
```

## 4. Component Hierarchy

### Design System Components
```
@/components/ui/
├── button.tsx          — Nút: primary, secondary, outline, ghost, danger
├── input.tsx           — Input với label, error, helper text
├── select.tsx          — Select với label
├── textarea.tsx        — Textarea với label
├── checkbox.tsx        — Checkbox với label
├── badge.tsx           — Status badge
├── card.tsx            — Card container
├── table.tsx           — Table with header, body, sort, pagination
├── table-empty.tsx     — Empty state cho table
├── modal.tsx           — Modal dialog
├── drawer.tsx          — Slide-in drawer
├── toast.tsx           — Toast notification
├── skeleton.tsx        — Loading skeleton
├── empty-state.tsx     — Empty state
├── error-state.tsx     — Error state
├── page-header.tsx     — Page header with breadcrumb
├── filter-bar.tsx      — Filter bar
├── confirm-dialog.tsx  — Xác nhận
├── badge.tsx           — Badge / status
├── breadcrumb.tsx      — Breadcrumb
├── tabs.tsx            — Tabs
└── pagination.tsx      — Pagination
```

### Page Components (existing, refactored)
```
@/components/
├── app-shell.tsx            — Refactored
├── login-form.tsx           — Refactored (simplified)
├── register-form.tsx        — Refactored
├── application-form.tsx     — Refactored with shared ui components
├── application-detail.tsx   — Refactored
├── supplement-form.tsx      — Refactored
├── review-panel.tsx         — Refactored
├── user-manager.tsx         — Refactored
├── branch-manager.tsx       — Refactored
├── club-manager.tsx         — Refactored
├── period-manager.tsx       — Refactored
├── storage-diagnostics.tsx  — Refactored
├── change-password-form.tsx — Refactored
└── evidence-gallery.tsx     — Refactored
```

## 5. Design Tokens

### Colors
```css
/* Primary */
--color-primary: #2563EB;
--color-primary-hover: #1D4ED8;

/* Backgrounds */
--color-bg: #F8FAFC;
--color-surface: #FFFFFF;

/* Borders */
--color-border: #E2E8F0;

/* Text */
--color-text-primary: #0F172A;
--color-text-secondary: #64748B;

/* Semantic */
--color-success-text: #166534;
--color-success-bg: #DCFCE7;
--color-warning-text: #92400E;
--color-warning-bg: #FEF3C7;
--color-error-text: #991B1B;
--color-error-bg: #FEE2E2;
--color-info-text: #1E40AF;
--color-info-bg: #DBEAFE;
```

### Typography
```css
--font-family: 'Inter', system-ui, -apple-system, sans-serif;
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-base: 13px;
--font-size-lg: 14px;
--font-size-xl: 16px;
--font-size-2xl: 20px;
--font-size-3xl: 24px;
--font-size-4xl: 30px;

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.7;
```

### Spacing (multiples of 4px, prefer 8px)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Radius
```css
--radius-sm: 6px;    /* inputs, buttons */
--radius-md: 8px;    /* cards, modals */
--radius-lg: 12px;   /* optional */
--radius-full: 9999px; /* badges, pills */
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(15,23,42,0.06);
--shadow-md: 0 4px 12px rgba(15,23,42,0.04);
```

## 6. Responsive Strategy

| Breakpoint | Name | Layout |
|------------|------|--------|
| > 1280px | Desktop XL | Full sidebar + max-width 1600px content |
| 1024–1280px | Desktop | Full sidebar |
| 900–1024px | Tablet landscape | Collapsed sidebar |
| 768–900px | Tablet | Drawer sidebar |
| < 768px | Mobile | Drawer sidebar + single column |

### Sidebar Behavior
- **Desktop (>1024px)**: Fixed, collapsible (icon + tooltip when collapsed)
- **Tablet (768–1024px)**: Collapsed by default, toggle to expand
- **Mobile (<768px)**: Drawer overlay, close on navigate
- State persisted in localStorage

## 7. Navigation Strategy

- **Sidebar**: Role-based primary navigation
- **Topbar breadcrumb**: Context-aware
- **Mobile**: Hamburger menu
- **Active state**: Exact match + nested match for sections
- **No dropdown menus** in sidebar (flat hierarchy)

## 8. Table Strategy

- **Desktop**: Full table with scroll-X when needed
- **Tablet**: Reduced columns (hide non-critical)
- **Mobile**: Card layout (one row = one card)
- **Sticky header** for long tables
- **Row hover** with subtle background
- **Actions** in last column (dropdown for 2+ actions)
- **Empty state** with icon + message
- **Loading skeleton** matching table structure
- **Sort** on clickable headers
- **Search** + **Filter** above table
- **Pagination** at bottom when > 20 rows

## 9. Form Strategy

- **Single column** on mobile
- **2 columns** on desktop
- **Field groups** with section headers
- **Required fields** marked with red asterisk
- **Validation** inline below field
- **Submit button** with loading state
- **Prevent double submit**
- **Unsaved changes warning** before navigation
- **Helper text** below field when needed
- **Maximum 4 fields** per row

## 10. Status System

| Status | Badge Style |
|--------|------------|
| draft | Gray (subtle) |
| submitted | Blue (info) |
| review | Blue (info) |
| revision | Yellow (warning) |
| passed | Green (success) |
| failed | Red (error) |

Each badge: small pill with colored background + text + optional icon.

## 11. Loading / Empty / Error States

### Loading States
- **Page level**: Skeleton matching page layout
- **Table**: Skeleton rows (5 rows)
- **Card**: Skeleton card
- **Buttons**: Spinner + disabled
- **Form submit**: Button spinner

### Empty States
- **Table**: Centered icon + message + optional CTA
- **List**: "Chưa có dữ liệu" message
- **Search results**: "Không tìm thấy" message with suggestion

### Error States
- **Inline form error**: Red banner above form
- **API error**: Inline notice
- **Page error**: Error boundary (existing)
- **Network error**: Retry button

### Forbidden / Unauthorized
- **403**: Specific reason (inactive, role, student-email)
- **401**: Session expired / missing profile

## 12. Migration Plan

### Phase A: Foundation (now)
1. Consolidate CSS → single `globals.css` with design tokens
2. Remove `modern-ui.css`
3. Create shared UI components in `@/components/ui/`
4. Import Inter font

### Phase B: Application Shell
1. Refactor `app-shell.tsx` to use new design tokens
2. Implement collapsible sidebar
3. Mobile drawer with overlay
4. Unified topbar with breadcrumb

### Phase C: Login Screen (Golden)
1. Redesign without gradients
2. Use new form components
3. Professional, clean layout

### Phase D: Dashboard (Golden)
1. KPI cards with new tokens
2. Table with new components
3. Recent activity list
4. Skeleton loading

### Phase E: Table Pages (Golden)
1. Applications list
2. Review queue
3. Results
4. Branch/Club/Period/Users tables

### Phase F: Form Pages (Golden)
1. New application form → refactored
2. Supplement form → refactored

### Phase G: Detail Pages
1. Application detail
2. Review detail

### Phase H: Remaining Pages
1. Register, change-password
2. Settings, configuration
3. Error pages (401, 403, 500, 404)

## 13. Verification Plan

### Technical
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run build` succeeds
- [ ] No lint errors
- [ ] All routes accessible
- [ ] No console errors

### Visual
- [ ] 1440×900 screenshot per page
- [ ] 768×1024 screenshot per page
- [ ] 390×844 screenshot per page
- [ ] Sidebar open + collapsed
- [ ] Mobile menu
- [ ] Loading states visible
- [ ] Empty states visible
- [ ] Error states visible

### Functional
- [ ] Login flow works
- [ ] Navigation by role works
- [ ] Form submission works
- [ ] Table filtering works
- [ ] Responsive behavior correct
