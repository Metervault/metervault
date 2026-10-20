/** Product names and the browser storage keys that used to carry the old brand. */
export const BRAND = {
  name: "MeterVault",
  mark: "MV",
  location: "Durban",
  description: "Field capture for installers, and a manager dashboard for the company.",
  fieldAppName: "MeterVault Field",
  fieldDescription: "Meter-change capture for MeterVault technicians.",
  officeAppName: "MeterVault Manager",
  officeDescription: "Manager dashboard for reviewing captures, stock, and exports.",
  themeColor: "#0A6B74",
  backgroundColor: "#F3F7F7",
} as const;

export const STORAGE = {
  theme: "metervault-theme",
  sunlight: "metervault-sunlight",
  tech: "metervault-tech",
  pauseSync: "metervault-pause-sync",
  fieldDb: "metervault-field",
  outbox: "metervault-outbox",
  cache: "metervault-field-v1",
} as const;
