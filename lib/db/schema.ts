import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Database {
  instances: {
    id: Generated<string>;
    country_code: string;
    domain: string | null;
    environment: Generated<string>;
    api_key_hash: string;
    label: string | null;
    disabled: Generated<boolean>;
    created_at: Generated<Timestamp>;
  };
  reports: {
    id: Generated<string>;
    country_code: string;
    domain: string | null;
    environment: Generated<string>;
    app_version: string | null;
    schema_version: string;
    reported_at: Timestamp;
    received_at: Generated<Timestamp>;
  };
  metrics: {
    id: Generated<number>;
    report_id: string;
    country_code: string;
    recorded_at: Timestamp;
    metric: string;
    value: number | null;
    value_text: string | null;
  };
}
