export const INSTALLATION_EXPORT = {
  meter_only: "meter only",
  white_and_blue_box: "white and blue box",
  non_straight: "Non-straight",
} as const;

export const PREMISE_EXPORT = {
  business: "Business",
  domestic: "Domestic",
} as const;

export const FAULT_EXPORT = {
  rm: "METER STOPPED (RM)",
  rp: "DIAL DAMAGED (RP)",
  rn: "METER DAMAGED (RN)",
  rc: "METER MOVING BACKWARDS (RC)",
  ro: "METER LEAK (RO)",
  rv: "METER TEST (RV)",
} as const;

export type InstallationCode = keyof typeof INSTALLATION_EXPORT;
export type PremiseCode = keyof typeof PREMISE_EXPORT;
export type FaultCode = keyof typeof FAULT_EXPORT;

export type JobStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "resubmitted";

export type PhotoEvidence = {
  url: string | null;
  answeredAt?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
};

/** Normalised job, already resolved to export strings for catalogs and towns. */
export type ExportJob = {
  deployment: string;
  enumerator: string;
  /** Contract setting. Only approved jobs are given a value. Sample word is "Final". */
  exportedStatus: string | null;
  responseCode: string | null;
  draftedOn: Date | null;
  submittedOn: Date | null;
  draftName: string | null;
  lastModifiedOn: Date | null;
  lastModifiedBy: string | null;
  approvalLevel: number | null;
  rejectionMessage: string | null;
  rejectionCount: number;
  editCount: number;
  ipAddress: string | null;
  jobDate: Date | null;
  installation: InstallationCode | null;
  premise: PremiseCode | null;
  companyName: string | null;
  cardNumber: string | null;
  jobNumber: string | null;
  houseNumber: string | null;
  street: string | null;
  unitNumber: string | null;
  lotNumber: string | null;
  town: string | null;
  faults: Record<FaultCode, boolean>;
  other: string | null;
  newMeterNumber: string | null;
  newMeterSize: string | null;
  newMeterClass: string | null;
  newMeterType: string | null;
  smartDeviceNumber: string | null;
  smartDeviceReading: number | null;
  oldMeterNumber: string | null;
  oldMeterNotOnList: boolean;
  oldMeterReading: number | null;
  connectionNumber: string | null;
  connectionNotOnList: boolean;
  connectionAnsweredAt: Date | null;
  accountNumber: string | null;
  photos: {
    meterNumber?: PhotoEvidence | null;
    newMeter?: PhotoEvidence | null;
    oldMeter?: PhotoEvidence | null;
    waterPoint?: PhotoEvidence | null;
    ciu?: PhotoEvidence | null;
    /** More than one URL is joined with a newline. The sample never has two, so this join is an inference. */
    other?: PhotoEvidence[] | null;
  };
  installerName: string | null;
  listPhrases?: {
    oldMeterSuffix: string;
    connectionValue: string;
  };
};
