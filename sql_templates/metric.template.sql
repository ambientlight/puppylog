CREATE MATERIALIZED VIEW {{identifier}} WITH (timescaledb.continuous)
AS
SELECT time_bucket('{{period}}', ts) as tbucket, {{statistic}}(*) total_logs FROM logrecords GROUP BY time_bucket('{{period}}', ts);

SELECT add_continuous_aggregate_policy('{{identifier}}',
    start_offset => '{{startOffset}}'::interval,
    end_offset => '{{endOffset}}'::interval,
    schedule_interval => '{{refreshInterval}}'::interval
);