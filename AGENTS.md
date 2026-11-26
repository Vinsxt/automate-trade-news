# Repository instructions

Read [docs/AGENTS.md](docs/AGENTS.md) before making changes. It contains the
engineering rules for the entire repository, including the
[secrets and security rules](docs/AGENTS.md#secrets-and-security).

## UI and visual experience

- Audit rendered pages and read the PRD before changing the UI. Preserve research
  flows, data definitions, source links, and backend behavior.
- Use the shared typography, color, spacing, surface, and motion tokens. Give
  each screen a clear primary task and keep data periods, units, and freshness visible.
- Reuse Tailwind, the shadcn/ui primitives in `src/components/ui`, Lucide, and
  Recharts. Consult official docs and licenses before
  adding tools or components. Add UI, motion, maps, or 3D libraries only for a
  demonstrated interaction or analytical need.
- Use short, purposeful transitions (roughly 150–300 ms), preserve keyboard
  focus, and respect reduced motion. Render meaningful data in charts and provide
  a text or table equivalent. Keep heavy chart code out of the initial bundle.
- Keep the decorative landing globe optional. Provide a static poster, a pause
  control, and reduced-motion and offscreen behavior for its animation.
- Keep AI loading and result presentation consistent across response sources.
  Preserve the client-only minimum duration, cache behavior, and freshness labels.
- Verify rendered desktop, tablet, and mobile pages in a browser, including
  keyboard flow, accessibility scans, loading and error states, and console
  errors. Run the repository checks and report any gaps.
