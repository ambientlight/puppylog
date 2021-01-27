#!/usr/bin/env bash

# usage: ./dumo_log.sh sample.log [loggroup_id]

if [[ "$#" -ne 1 ]]; then
    echo "Illegal number of parameters, format: ./dump_log.sh logfile"
    exit 1
fi

if [[ $(psql -t -c "SELECT EXISTS(SELECT FROM loggroups WHERE id = 0)" | tr -d '[:space:]') == 'f' ]]; then
    echo "NO LOGGROUP YET"
fi

# quick injection test
cat "$1" | while read line || [[ -n $line ]]; do
    no_dq=$(echo "$line" | sed 's/\"//g')
    arr=($no_dq)
    ip=${arr[0]}
    user=${arr[0]}
    ts=$(echo "${arr[3]} ${arr[4]}" | sed -E 's/\[|\]//g')
    method=${arr[5]}
    route=${arr[6]}
    proto=${arr[7]}
    code=${arr[8]}
    size=${arr[9]}

    echo $size
done