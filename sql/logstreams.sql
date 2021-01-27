CREATE TABLE IF NOT EXISTS logstreams (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    -- log stream source (filepath prefixed with file:// or stream url)
    source_uri TEXT NOT NULL,
    loggroup_id INT NOT NULL,
    -- byte offset after last read from the source stream (when applicable)
    stream_boffset NUMERIC,

    CONSTRAINT fk_loggroup_id FOREIGN KEY(loggroup_id) REFERENCES loggroups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS logstream_by_group_source ON logstreams(loggroup_id, source_uri);
