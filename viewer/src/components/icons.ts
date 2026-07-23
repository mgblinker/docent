function icon(path: string, size = 16): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export const CATEGORY_ICONS: Record<string, string> = {
  Flows: icon(
    '<rect x="2" y="4" width="7" height="6" rx="1"/><rect x="15" y="14" width="7" height="6" rx="1"/><path d="M9 7h4a2 2 0 0 1 2 2v6"/>',
  ),
  Platform: icon(
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ),
  Services: icon(
    '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>',
  ),
  Products: icon(
    '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  ),
  Infrastructure: icon(
    '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/>',
  ),
  Architecture: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  "Modules and Services": icon(
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ),
  "Manuals and HowTos": icon(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  ),
};

export const DOC_TYPE_ICONS: Record<string, string> = {
  modules: icon(
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    14,
  ),
  flows: icon(
    '<rect x="2" y="4" width="7" height="6" rx="1"/><rect x="15" y="14" width="7" height="6" rx="1"/><path d="M9 7h4a2 2 0 0 1 2 2v6"/>',
    14,
  ),
  architecture: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>', 14),
  manual: icon(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    14,
  ),
  other: icon(
    '<circle cx="12" cy="12" r="10"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    14,
  ),
};

export const FOLDER_ICON = icon(
  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  15,
);

export const COMPONENT_ICONS: Record<string, string> = {
  apigateway: icon(
    '<path d="M9 7V2M15 7V2M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"/><path d="M12 15v4"/><path d="M8 22h8"/>',
    15,
  ),
  backend: icon(
    '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    15,
  ),
  eventbus: icon(
    '<path d="M7 3 3 7l4 4"/><path d="M3 7h11a4 4 0 0 1 4 4v1"/><path d="M17 21l4-4-4-4"/><path d="M21 17H10a4 4 0 0 1-4-4v-1"/>',
    15,
  ),
  sharedkernel: icon(
    '<path d="M4 7h4V4.5a1.5 1.5 0 0 1 3 0V7h6V4.5a1.5 1.5 0 0 1 3 0V7h1a1 1 0 0 1 1 1v5h-2.5a1.5 1.5 0 0 0 0 3H22v5a1 1 0 0 1-1 1h-5v-2.5a1.5 1.5 0 0 0-3 0V22H8a1 1 0 0 1-1-1v-5H4.5a1.5 1.5 0 0 1 0-3H7V8a1 1 0 0 1 1-1Z"/>',
    15,
  ),
  'webapp-angular': icon('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>', 15),
  authentication: icon('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 15),
  automationservice: icon(
    '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a3 3 0 0 1 3 3"/><path d="M9 18H6a3 3 0 0 1-3-3"/>',
    15,
  ),
  billingservice: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', 15),
  fileservice: icon(
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H3Z"/><path d="M3 9l1.5 9a2 2 0 0 0 2 1.7h11a2 2 0 0 0 2-1.7L21 9"/>',
    15,
  ),
  integrationservice: icon(
    '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
    15,
  ),
  licensingservice: icon('<circle cx="12" cy="8" r="6"/><path d="M9 14 7 22l5-3 5 3-2-8"/>', 15),
  loggingservice: icon('<path d="M4 4h16v16H4Z"/><path d="m8 9 3 3-3 3M13 15h4"/>', 15),
  processinsightsservice: icon('<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-8"/>', 15),
  settingsservice: icon(
    '<path d="M4 6h10M4 12h6M4 18h10"/><circle cx="17" cy="6" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    15,
  ),
  tenantprovisioning: icon(
    '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1M9 22v-4h6v4"/>',
    15,
  ),
  testingkernel: icon('<path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2"/><path d="M9 2h6M6 15h12"/>', 15),
  website: icon('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>', 15),
  cicd: icon(
    '<path d="M18.5 12a3.5 3.5 0 1 1-3.5-3.5c1.5 0 2.5 1 3.5 3.5s2 3.5 3.5 3.5a3.5 3.5 0 1 0 0-7c-1.5 0-2.5 1-3.5 3.5"/>',
    15,
  ),
  immobroker: icon('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>', 15),
  planning: icon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 15),
  architecture: icon(
    '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    15,
  ),
};

export const SUN_ICON = icon(
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  16,
);

export const MOON_ICON = icon('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>', 16);

export const FILE_ICON = icon(
  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
  13,
);
