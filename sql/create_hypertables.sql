CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

SELECT create_hypertable('logrecords', 'ts', if_not_exists => TRUE);
