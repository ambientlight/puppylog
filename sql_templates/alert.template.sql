CREATE OR REPLACE PROCEDURE {{identifier}}(job_id int, config jsonb) LANGUAGE PLPGSQL AS
$$
DECLARE
    hits INT;
    last_ts TIMESTAMP;
    alert_name TEXT;
    interval_offset INTERVAL;
    alert_level INT;
BEGIN
    RAISE NOTICE 'Executing job % with config %', job_id, config;

    SELECT jsonb_object_field_text(config, 'offset')::interval INTO STRICT interval_offset;
    SELECT jsonb_object_field_text(config, 'alert_name')::text INTO STRICT alert_name;
    SELECT jsonb_object_field_text(config, 'level')::int INTO STRICT alert_level;
    
    BEGIN
        SELECT tbucket, observation INTO STRICT last_ts, hits from {{metricIdentifier}} WHERE tbucket > now() - interval_offset ORDER BY tbucket DESC LIMIT 1;
        IF hits > alert_level THEN
            INSERT INTO alerthistory(job_id, name, trigger_ts, alert_level, observed_level, metric) 
            VALUES (job_id, {{identifier}}, last_ts, alert_level, hits, '{{metricIdentifier}}');

            -- pg_notify does not push (only queues notifications) when total_traffic_alert 
            -- runs under timescaledb job scheduler. can be an issue on timescaledb side? 
            -- (later manual invocations of this procedure will push those queued notifications) 
            -- so will have to go with pull-based approach on the client
            -- though event based approach after initial fetch would have been somehow cleaner

            -- PERFORM pg_notify('total_traffic_alert', format('{"ts":"%s", "hits":"%s"}', last_ts, hits));
        END IF;
        RAISE NOTICE '% %', last_ts, hits;

    EXCEPTION WHEN no_data_found THEN
        -- no requests after our timestamp or total traffic was not materialized
        RAISE NOTICE 'no aggregated requests after %', now() - interval_offset;
    END;

END $$;

SELECT add_job('{{identifier}}', '{{period}}'::interval, config => '{"alert_name":"{{alertName}}", "offset": "{{offset}}", "metric_identifier": "{{metricIdentifier}}", "level": {{alertLevel}}}');