import { FAULT_EXPORT, INSTALLATION_EXPORT, PREMISE_EXPORT } from "../export/job";
import type { FormDefinition, SelectOption } from "./types";

function options(map: Record<string, string>): SelectOption[] {
  return Object.entries(map).map(([value, exportValue]) => ({
    value,
    label: exportValue,
    export: exportValue,
  }));
}

const installationLabels: Record<keyof typeof INSTALLATION_EXPORT, string> = {
  meter_only: "Meter only",
  white_and_blue_box: "Meter with white and blue box",
  non_straight: "Non-straight",
};

export const METER_CHANGE_V1: FormDefinition = {
  key: "meter-change",
  version: 1,
  sections: [
    {
      id: "job",
      title: "Meter change",
      fields: [
        { id: "date", label: "Date", exportHeader: "DATE:", type: "date", required: true, defaultFrom: "today" },
        {
          id: "installation",
          label: "Meter installation",
          exportHeader: "Please select meter installation -meter only or meter with white and blue box",
          type: "select",
          required: true,
          options: (Object.keys(INSTALLATION_EXPORT) as (keyof typeof INSTALLATION_EXPORT)[]).map((value) => ({
            value,
            label: installationLabels[value],
            export: INSTALLATION_EXPORT[value],
          })),
        },
        {
          id: "premise",
          label: "Business or domestic",
          exportHeader: "Please select Business or Domestic",
          type: "select",
          required: true,
          options: options(PREMISE_EXPORT),
        },
        {
          id: "companyName",
          label: "Company name",
          exportHeader: "COMPANY NAME:",
          type: "text",
          required: true,
          defaultFrom: "contract.companyName",
        },
        { id: "cardNumber", label: "Card number", exportHeader: "CARD NUMBER:", type: "text", required: false },
        { id: "jobNumber", label: "Job number", exportHeader: "JOB NUMBER:", type: "text", required: false },
      ],
    },
    {
      id: "address",
      title: "Address",
      fields: [
        { id: "houseNumber", label: "House number", exportHeader: "HOUSE NUMBER:", type: "text", required: false, help: "Leave blank when the number is part of the street line. A plain integer is exported as a number." },
        { id: "street", label: "Street", exportHeader: "STREET:", type: "text", required: true },
        { id: "unitNumber", label: "Unit number", exportHeader: "UNIT NUMBER", type: "text", required: false },
        { id: "lotNumber", label: "Lot number", exportHeader: "LOT NUMBER", type: "text", required: false },
        { id: "townId", label: "Town", exportHeader: "TOWN:", type: "town", required: true, help: "Picked from the contract town list." },
      ],
    },
    {
      id: "reason",
      title: "Reason",
      fields: [
        { id: "faultRm", label: "Meter stopped (RM)", exportHeader: FAULT_EXPORT.rm, type: "boolean", required: false },
        { id: "faultRp", label: "Dial damaged (RP)", exportHeader: FAULT_EXPORT.rp, type: "boolean", required: false },
        { id: "faultRn", label: "Meter damaged (RN)", exportHeader: FAULT_EXPORT.rn, type: "boolean", required: false },
        { id: "faultRc", label: "Meter moving backwards (RC)", exportHeader: FAULT_EXPORT.rc, type: "boolean", required: false },
        { id: "faultRo", label: "Meter leak (RO)", exportHeader: FAULT_EXPORT.ro, type: "boolean", required: false },
        { id: "faultRv", label: "Meter test (RV)", exportHeader: FAULT_EXPORT.rv, type: "boolean", required: false },
        { id: "other", label: "Other", exportHeader: "OTHER:", type: "text", required: false, defaultValue: "Meter replacement" },
      ],
    },
    {
      id: "meter",
      title: "Meter details",
      fields: [
        {
          id: "newMeterNumber",
          label: "New meter number",
          exportHeader: "NEW METER NUMBER",
          type: "text",
          required: true,
          pattern: { source: "^[A-Z]{3}\\d{3}$", severity: "warn", message: "Expected 3 letters and 3 digits, for example CZZ863." },
        },
        { id: "meterSizeId", label: "New meter size", exportHeader: "NEW METER SIZE", type: "catalog", catalog: "size", required: true, defaultFrom: "contract.meterSize" },
        { id: "meterClassId", label: "New meter class", exportHeader: "NEW METER CLASS", type: "catalog", catalog: "class", required: true, defaultFrom: "contract.meterClass" },
        { id: "meterTypeId", label: "New meter type", exportHeader: "NEW METER TYPE", type: "catalog", catalog: "type", required: true, defaultFrom: "contract.meterType" },
        {
          id: "smartDeviceNumber",
          label: "Smart device number",
          exportHeader: "SMART DEVICE NUMBER",
          type: "text",
          required: true,
          pattern: { source: "^\\d{11}$", severity: "warn", message: "Expected an 11-digit device number." },
          help: "11 digits from the device barcode. This is not the reading.",
        },
        {
          id: "smartDeviceReading",
          label: "Smart device reading",
          exportHeader: "SMART DEVICE READING",
          type: "integer",
          required: true,
          forbidPattern: { source: "^\\d{11}$", severity: "warn", message: "This looks like a device number, not a reading." },
          help: "Usually 0 on install.",
        },
        {
          id: "oldMeterNumber",
          label: "Old meter number",
          exportHeader: "OLD METER NUMBER",
          type: "text",
          required: true,
          pattern: { source: "^([A-Z]{3}\\d{3,4}|[A-Z]-[A-Z]{3}\\d{3})$", severity: "warn", message: "Expected a meter number such as CXV220 or C-CHQ390." },
        },
        { id: "oldMeterNotOnList", label: "Old meter not on municipal list", type: "boolean", required: false },
        { id: "oldMeterListNote", label: "Old meter list note", type: "text", required: false, help: "Kept on the job. The export writes the legacy suffix instead of this note." },
        { id: "oldMeterReading", label: "Old meter reading", exportHeader: "OLD METER READING", type: "integer", required: true },
        {
          id: "connectionNumber",
          label: "Connection number",
          exportHeader: "CONNECTION NUMBER (2)",
          type: "text",
          required: true,
          requiredUnless: "connectionNotOnList",
          pattern: { source: "^(W\\d{6,7}|WO\\d{5,7}|W\\d{6}[A-Z])$", severity: "warn", message: "Expected W plus 6 or 7 digits, WO plus digits, or W plus 6 digits and a letter." },
        },
        { id: "connectionNotOnList", label: "Connection number not on list", type: "boolean", required: false },
        { id: "connectionListNote", label: "Connection list note", type: "text", required: false },
        { id: "accountNumber", label: "Account number", exportHeader: "ACCOUNT NUMBER", type: "text", required: false },
      ],
    },
    {
      id: "photos",
      title: "Pictures",
      fields: [
        { id: "photoMeterNumber", label: "Photo of the meter number", exportHeader: "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC)", type: "photo", required: true, gps: true },
        { id: "photoNewMeter", label: "Photo of the new meter", exportHeader: "PLEASE TAKE A PHOTO OF NEW METER", type: "photo", required: true },
        { id: "photoOldMeter", label: "Photo of the old meter", exportHeader: "PLEASE TAKE A PHOTO OF OLD METER", type: "photo", required: true },
        { id: "photoWaterPoint", label: "Photo of the water point", exportHeader: "PLEASE TAKE A PHOTO OF THE WATER POINT", type: "photo", required: true, gps: true },
        { id: "photoCiu", label: "Photo of the CIU and new meter card", exportHeader: "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD", type: "photo", required: false, gps: true, help: "Optional. This contract's historical export left it blank." },
        { id: "photoOther", label: "Any other photo", exportHeader: "ANY OTHER PHOTO", type: "photo", required: false, multiple: true },
      ],
    },
    {
      id: "signoff",
      title: "Installer",
      fields: [
        { id: "installerId", label: "Installation done by", exportHeader: "INSTALLATION DONE BY:", type: "installer", required: true, defaultFrom: "session.installer" },
      ],
    },
  ],
};

export function fieldsOf(form: FormDefinition) {
  return form.sections.flatMap((section) => section.fields);
}
