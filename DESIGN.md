# SkillsSphere-AI Design System & Theme Guide

This document is a highly detailed, comprehensive guide to the design philosophy, aesthetic themes, and reusable UI components of the SkillsSphere-AI platform. It is designed to help contributors quickly build new modules that perfectly match the existing platform look and feel.

---

## 1. Global Design Philosophy

The aesthetic of SkillsSphere-AI combines **Modern Glassmorphism** with **Subtle Cyberpunk** undertones. It prioritizes deep, immersive backgrounds with vibrant, glowing accents to create a premium, high-tech feel. 

### Core Configuration (`tailwind.config.cjs`)
The platform heavily relies on Tailwind CSS with a `dark:class` strategy. The theme extends Tailwind's default palette with custom branding.

#### Typography
We use a dual-font system:
- **Headings**: `Outfit` — Geometric, bold, and modern. Used for page titles and card headers.
- **Body Text**: `Inter` — Highly legible, neutral sans-serif for UI elements, paragraphs, and data tables.

#### The Color Palette
| Variable Name | Hex Code | Usage |
| :--- | :--- | :--- |
| `bg-dark-bg` | `#0B0F19` | The overarching, deep blue/black background color of the application. |
| `bg-surface` | `#131B2C` | The elevated surface color used for cards, sidebars, and modals. |
| `text-brand-500` | `#6366f1` | The primary brand indigo color. |
| `text-primary` | `#4F46E5` | The core action color (buttons, active states). |
| `text-secondary` | `#10B981` | Emerald green, used for success states and gradient transitions. |
| `text-main` | `#F3F4F6` | Primary high-contrast text color (almost white). |
| `text-muted`| `#9CA3AF` | Secondary, lower-contrast text for hints and descriptions. |
| `border-border` | `#1F2937` | Used for subtle separation lines and card outlines. |

---

## 2. Page-by-Page Theme Breakdown

### A. Landing Page
**Theme**: "Immersive Tech"
- **Background**: Uses `animate-cockpit-glow` and massive floating gradient orbs (`orbFloat` animation in `index.css`) behind the DOM to create a sense of depth.
- **Hero Text**: Large headings utilize `.text-gradient` (`bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary`) to immediately draw the eye.
- **Visuals**: Features animated grid lines (`animate-scan-line`) overlaying the hero section to emphasize the "AI/Tech" nature of the platform.

### B. Auth Pages (Login & Sign Up)
**Theme**: "Elevated Focus"
- **Layout**: Centered flexbox layouts spanning `min-h-screen`.
- **Card Styling**: Glassmorphic panels built using `bg-surface/90 backdrop-blur-md border border-border shadow-soft`.
- **Inputs**: Inputs feature smooth, high-contrast focus rings (`focus:ring-2 focus:ring-brand-500`) to guide the user's attention.

### C. Student Dashboard & Modules
**Theme**: "Data Visibility & Encouragement"
- **Layout**: Grid-based layouts (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Cards**: Standardized `bg-surface rounded-xl border border-border p-6`.
- **Interactive Elements**: Hover states elevate the cards (`hover:-translate-y-1 hover:shadow-lg transition-all`).
- **Score Highlights**: Excellent AI scores (≥85) utilize animated gradient borders (`.animated-gradient-box`) to reward the student visually.

### D. Tutor Analytics
**Theme**: "Information Density"
- **Visualizations**: Extensive use of `Recharts` (Treemaps and BarCharts). Tooltips are heavily customized with `bg-surface border border-border text-main` to match the dark theme natively.
- **Data Tables**: Clean tables with sticky headers. Rows use `hover:bg-surface-hover` to help tutors track data horizontally.

### E. Recruiter Jobs & Talent Finder
**Theme**: "Semantic Precision"
- **Layout**: Complex split-pane layouts (Filters on the left, Candidate Cards on the right).
- **Badges**: Heavy use of color-coded semantic badges to instantly convey AI insights to recruiters:
  - Excellent Match: `bg-green-500/10 text-green-400 border border-green-500/20`
  - Weak Alignment: `bg-red-500/10 text-red-400 border border-red-500/20`
- **Actions**: Primary actions ("Invite to Apply") use the solid `Button` with variant `primary`, while secondary actions ("Evaluate Match") use the `outline` variant.

---

## 3. Core CSS Animations (`index.css`)

The platform utilizes several custom CSS keyframes to bring the UI to life:

- `animate-slide-up`: Smooth entry animation for loading cards and modals.
- `animate-pulse-soft`: A very gentle pulsing opacity, used for "Live" indicators (e.g., Live Classrooms).
- `.gradient-border`: Uses `-webkit-mask-composite: xor` to create a beautiful, 1px gradient border around cards without using nested divs.
- `.animated-gradient-box`: A moving background gradient utilized behind critical focal points (like the Mock Interview Lobby screen).

---

## 4. Copy-Paste Code Designs for Contributors

When building new features, do not write raw HTML buttons or inputs. Import the shared components from `client/src/shared/components/`. 

Below are blueprint examples of how to construct UI elements matching the theme.

### Blueprint 1: Standard Dashboard Panel
Use this structure when building a new widget or section.

```jsx
import React from 'react';

const DashboardPanel = ({ title, children }) => {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm transition-all hover:shadow-md">
      {/* Header section with Outfit font */}
      <div className="px-6 py-4 border-b border-border bg-surface-soft/50">
        <h3 className="text-lg font-heading font-semibold text-text-main">
          {title}
        </h3>
      </div>
      
      {/* Content section */}
      <div className="p-6 text-sm text-text-muted">
        {children}
      </div>
    </div>
  );
};

export default DashboardPanel;
```

### Blueprint 2: Using the Shared Button Component
The `Button` component supports various variants, sizes, loading states, and Lucide React icons.

```jsx
import React, { useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import Button from '@/shared/components/Button';

const ActionRow = () => {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {/* Primary Brand Button */}
      <Button 
        variant="primary" 
        size="md" 
        onClick={() => console.log('Clicked')}
        rightIcon={<ArrowRight size={18} />}
      >
        Continue
      </Button>

      {/* Outline Button with Loading State */}
      <Button 
        variant="outline" 
        loading={isSaving}
        onClick={() => setIsSaving(true)}
        leftIcon={<Save size={18} />}
      >
        Save Draft
      </Button>

      {/* Ghost button for secondary/cancel actions */}
      <Button variant="ghost">Cancel</Button>
    </div>
  );
};
```

### Blueprint 3: Using the Shared Input Component
The `Input` component handles accessible labeling, error states, and icon injection automatically.

```jsx
import React, { useState } from 'react';
import { Search, Mail } from 'lucide-react';
import Input from '@/shared/components/Input';

const FormExample = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-4 max-w-sm">
      {/* Standard Input with Icon */}
      <Input
        id="search-query"
        placeholder="Search candidates..."
        leftIcon={<Search size={18} />}
      />

      {/* Input with Label and Error State */}
      <Input
        id="email-address"
        label="Email Address"
        type="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (!e.target.value.includes('@')) setError('Invalid email address');
          else setError('');
        }}
        error={error}
        leftIcon={<Mail size={18} />}
      />
    </div>
  );
};
```

### Blueprint 4: Color-Coded Status Badges
Often used in the Recruiter and Tutor modules to represent statuses or AI scores.

```jsx
const StatusBadge = ({ status }) => {
  const styles = {
    excellent: "bg-green-500/10 text-green-400 border border-green-500/20",
    moderate: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    weak: "bg-red-500/10 text-red-400 border border-red-500/20",
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
};
```
