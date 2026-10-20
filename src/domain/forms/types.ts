export type FieldType = "date" | "select" | "text" | "integer" | "boolean" | "town" | "installer" | "photo" | "catalog" | "locked_text";

export type CatalogKind = "size" | "class" | "type";

export type SelectOption = {
  value: string;
  label: string;
  export: string;
};

export type FieldRule = {
  source: string;
  severity: "block" | "warn";
  message: string;
};

export type FormField = {
  id: string;
  label: string;
  exportHeader?: string;
  type: FieldType;
  required: boolean;
  /** When this boolean field is true, `required` is waived. */
  requiredUnless?: string;
  multiple?: boolean;
  locked?: boolean;
  defaultValue?: string;
  defaultFrom?:
    | "today"
    | "contract.companyName"
    | "contract.meterSize"
    | "contract.meterClass"
    | "contract.meterType"
    | "session.installer";
  options?: SelectOption[];
  catalog?: CatalogKind;
  pattern?: FieldRule;
  /** A second pattern that warns, used for the swapped smart-device reading. */
  forbidPattern?: FieldRule;
  help?: string;
  gps?: boolean;
};

export type FormSection = {
  id: string;
  title: string;
  fields: FormField[];
};

export type FormDefinition = {
  key: "meter-change";
  version: number;
  sections: FormSection[];
};

export type Answers = Record<string, unknown>;
