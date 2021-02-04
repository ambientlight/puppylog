#!/usr/bin/env bash

# usage: ./bootstrap_model.sh [--distributed]

# most likely you would want to have PGPASSWORD, PGUSER, PGHOST environment variables set
psql < ./sql/loggroups.sql
psql < ./sql/logstreams.sql
psql < ./sql/logrecords.sql
# generate default loggroup
psql -t -c "INSERT INTO loggroups (name) VALUES ('default');"

if [[ "$1" == "--distributed" ]]; then 
    psql < ./sql/create_dist_hypertables.sql
else 
    psql < ./sql/create_hypertables.sql
fi

