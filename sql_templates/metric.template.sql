CREATE MATERIALIZED VIEW {{identifier}} WITH (timescaledb.continuous)
AS
SELECT {{{customSegmentExpression}}} time_bucket('{{period}}', ts) as tbucket, {{statistic}}({{property}}) total_logs FROM logrecords GROUP BY {{{customSegmentExpression}}} time_bucket('{{period}}', ts);
-- By default, the database will automatically create composite indexes on each column specified in the GROUP BY combined with the time_bucket column

SELECT add_continuous_aggregate_policy('{{identifier}}',
    start_offset => '{{startOffset}}'::interval,
    end_offset => '{{endOffset}}'::interval,
    schedule_interval => '{{refreshInterval}}'::interval
);