CREATE MATERIALIZED VIEW total_traffic WITH (timescaledb.continuous)
AS
SELECT time_bucket('1 minutes', ts) as tbucket, COUNT(*) total_logs FROM logrecords GROUP BY time_bucket('1 minutes', ts);

SELECT add_continuous_aggregate_policy('total_traffic',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute'
);