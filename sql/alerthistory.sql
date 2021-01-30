CREATE TABLE IF NOT EXISTS alerthistory (
    job_id INT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    -- timestamp when alert was triggered
    trigger_ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    alert_level NUMERIC NOT NULL,
    observed_level NUMERIC NOT NULL,
    metric TEXT
);

CREATE INDEX IF NOT EXISTS alerthistory_by_trigger_ts ON alerthistory(trigger_ts DESC);