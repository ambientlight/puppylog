SELECT view_name, materialization_hypertable_name, view_definition, timescaledb_information.jobs.config
FROM timescaledb_information.continuous_aggregates
INNER JOIN timescaledb_information.jobs ON timescaledb_information.jobs.hypertable_name = materialization_hypertable_name