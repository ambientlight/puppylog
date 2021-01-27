CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

SELECT create_distributed_hypertable('logrecords', 'ts', 'logstream_id', if_not_exists => TRUE);