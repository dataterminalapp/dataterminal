import { ClientResult } from "./local/types";

export const buildNoticeError = (id: string, message: string) => {
  const noticeError: ClientResult = {
    command: id,
    fields: [],
    oid: -1,
    rowCount: 0,
    rows: [],
    timing: 0,
    transaction: undefined,
    notice: {
      code: undefined,
      column: undefined,
      constraint: undefined,
      dataType: undefined,
      detail: undefined,
      file: undefined,
      hint: undefined,
      internalPosition: undefined,
      internalQuery: undefined,
      length: 0,
      line: undefined,
      message: message,
      name: "notice",
      severity: "WARNING",
      position: undefined,
      where: undefined,
      schema: undefined,
      table: undefined,
      routine: undefined,
    },
  };

  return noticeError;
};

export const createTemporalTableChannelNameFunction = () => `
CREATE OR REPLACE FUNCTION temp_notify.get_table_channel_name(schema_name text, table_name text, operation text DEFAULT NULL)
RETURNS text AS $$
BEGIN
    IF operation IS NOT NULL THEN
        RETURN LOWER(schema_name || '.' || table_name || '.' || operation);
    END IF;
    RETURN LOWER(schema_name || '.' || table_name);
END;
$$ LANGUAGE plpgsql;
`;

export const createTemporalListenerFunction = () => `
CREATE OR REPLACE FUNCTION temp_notify.notify_table_changes()
RETURNS trigger AS $$
DECLARE
    notification_data jsonb;
    table_channel text;
    operation_channel text;
BEGIN
    -- Get channel names using the temporary schema function
    table_channel := temp_notify.get_table_channel_name(TG_TABLE_SCHEMA, TG_TABLE_NAME);
    
    CASE TG_OP
    WHEN 'INSERT' THEN
        notification_data = jsonb_build_object(
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP,
            'new_data', row_to_json(NEW)
        );
    WHEN 'UPDATE' THEN
        notification_data = jsonb_build_object(
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP,
            'old_data', row_to_json(OLD),
            'new_data', row_to_json(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(row_to_json(NEW)::jsonb)
                WHERE row_to_json(NEW)::jsonb->key IS DISTINCT FROM row_to_json(OLD)::jsonb->key
            )
        );
    WHEN 'DELETE' THEN
        notification_data = jsonb_build_object(
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP,
            'old_data', row_to_json(OLD)
        );
    END CASE;

    -- Send notifications
    PERFORM pg_notify(table_channel, notification_data::text);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;`;
