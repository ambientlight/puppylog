-- meant for grouping together log streams and usually maps 1-to-1 with specific application

CREATE TABLE IF NOT EXISTS loggroups (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT
);