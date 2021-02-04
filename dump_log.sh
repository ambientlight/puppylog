#!/usr/bin/env bash

# this was meant for quick injection test
# most likely you want to LOOK INTO src/collector.ts that should be used a log injector 
#
# usage: ./dumo_log.sh sample.log [loggroup_id]

if [[ "$#" -ne 1 ]]; then
    echo "Illegal number of parameters, format: ./dump_log.sh logfile"
    exit 1
fi

if [[ $(psql -t -c "SELECT EXISTS(SELECT FROM loggroups WHERE id = 1);" | tr -d '[:space:]') == 'f' ]]; then
    echo "No default loggroup yet, creating"
    psql -t -c "INSERT INTO loggroups (name) VALUES ('default');"
fi

logstream_source_uri="file://$(pwd)/$1"
logstream_id=$(psql -t -c "SELECT id FROM logstreams WHERE source_uri = '${logstream_source_uri}' AND loggroup_id = 1;" | tr -d '[:space:]')
if [[ -z "${logstream_id}" ]]; then
    echo "No logstream yet for ${logstream_source_uri}, creating"
    psql -t -c "INSERT INTO logstreams (source_uri, loggroup_id) VALUES ('${logstream_source_uri}', 1);"
    logstream_id=$(psql -t -c "SELECT id FROM logstreams WHERE source_uri = '${logstream_source_uri}' AND loggroup_id = 1;" | tr -d '[:space:]')
fi

cat "$1" | while read line || [[ -n $line ]]; do
    no_dq=$(echo "$line" | sed 's/\"//g')
    arr=($no_dq)
    ip=${arr[0]}
    user=${arr[2]}
    ts=$(echo "${arr[3]}" | sed -E 's/\[|\]//g')
    method=${arr[5]}
    route=${arr[6]}
    proto=${arr[7]}
    code=${arr[8]}
    size=${arr[9]}

    psql -t -c "
        INSERT INTO logrecords (ts, logstream_id, host, ruser, request_method, request_route, request_proto, status_code, response_bsize)
        VALUES (TO_TIMESTAMP('${ts}', 'DD/Mon/YYYY:HH24:MI:SS'), $logstream_id, '$ip', '$user', '$method', '$route', '$proto', $code, $size);
    "
done