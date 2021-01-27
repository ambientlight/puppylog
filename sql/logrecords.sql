-- based on https://httpd.apache.org/docs/2.4/logs.html and http://httpd.apache.org/docs/current/mod/mod_log_config.html

DO $$ BEGIN
    CREATE TYPE HTTP_METHOD AS ENUM ('GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH');
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS logrecords (
    ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    logstream_id INT,

    host CIDR,
    -- apache's mod_indent remote log name 
    indent_logname TEXT,
    ruser TEXT,

    -- let's expand the request line %r so we don't need to operate on strs
    request_method HTTP_METHOD,
    request_route TEXT,
    request_proto TEXT,

    status_code SMALLINT,
    -- response size (bytes) excluding response headers
    response_bsize NUMERIC,

    CONSTRAINT fk_logstream_id FOREIGN KEY(logstream_id) REFERENCES logstreams(id) ON DELETE CASCADE
);

