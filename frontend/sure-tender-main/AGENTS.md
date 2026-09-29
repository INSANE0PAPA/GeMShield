- Use the root LanguageProvider for locale state and local translation dictionaries; this keeps language persistent and reusable without runtime translation services.
- Government Official self-registration creates a pending access request and never grants an officer role; only an authorized officer approval may grant it, preventing privilege escalation.
- Dashboard copy is resolved through `DASHBOARD_TRANSLATIONS` and navigation factories, so the persisted root language changes the entire role workspace consistently.
- Human Review, Final Decisions, and Bid Passports are separate persisted workflows; only submitted bids with completed linked compliance runs can be finalized, because standalone checks are not procurement decisions.
- Compliance results are advisory; only the Final Decisions workflow may record approval or rejection, so review gates, immutable snapshots, and passports cannot be bypassed.
- Compliance rules are managed as immutable published versions; checks must snapshot the active version so historical outcomes remain replayable.
- Keep the expanded audit-event experience as a dialog component fed by the audit list query; this avoids nested route conflicts while preserving real related-event context.

