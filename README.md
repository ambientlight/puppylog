## Puppylog

A tiny distributed log collector

## Requirements

- [ ] It should default to reading /tmp/access.log and be overrideable
- [ ] Display stats every 10s about the traffic during those 10s: the sections of the web site with the most hits, as well as interesting summary statistics on the traffic as a whole. A section is defined as being what's before the second '/' in the resource section of the log line. For example, the section for "/pages/create" is "/pages"

- [ ] Make sure a user can keep the app running and monitor the log file continuously

- [ ] Whenever total traffic for the past 2 minutes exceeds a certain number on average, print or display a message saying that “High traffic generated an alert - hits = {value}, triggered at {time}”. The default threshold should be 10 requests per second, and should be overridable

- [ ] Whenever the total traffic drops again below that value on average for the past 2 minutes, print or display another message detailing when the alert recovered

- [ ] Write a test for the alerting logic
- [ ] Explain how you’d improve on this application design

## Why timescale is selected for this problem

1. Built-in sharding 
2. Auto-archivation of historical data
3. Materialized views that autoupdate (continious aggregates)
4. as extension to postgres, we can still use all awesome postgres addtional sugar, such as its pubsub.

## TODOS

### st0
- [X] Data models: LogGroups, LogStreams, LogRecord, AlertHistory
- [X] Bash scripts for the above data models, continious aggregates
- [X] Crude base script that reads line-by-line space delimited logs sequentially and dumps into timescale 
- [ ] Make sure that continious aggregates that sample every 10seconds have reasonable perf on large injection - simple count metrics
- [ ] Database queries for formatted metrics: most hits - top 10 of COUNT metric for each root subpath. Materialized view for each url root subpath? ok as longs as sane num of them.

### st1
- [ ] dep on time, typescript or reasonml revamps for bash scripts ~~with knex.js~~, no knex.js as most of timescale things we need are not wrapped there, lets use templates with sql
- [ ] fetch latest timestamp and only parse logs after timestamp
- [ ] allow running injector in the background -> file change observation vs timechecked?
- [ ] allow running injector as daemon under systemd
- [ ] allow customizing input log file, clf format in logs, filter out invalid log lines, don't crash on them, dump invalid lines to stderr
- [ ]  basic textual tabular alert view with a seperate console tool
- [ ]  basic test coverage

### st2
- [ ] test PG_NOTIFY on trigger  https://stackoverflow.com/questions/5412474/using-pg-notify-in-postgresql-trigger-function
- [ ] wrappers for pubsub
- [ ] alert recovered in stateless query
- [ ] docker for single node timescaledb deployment
- [ ] kubernetes for scalable -> guide with microk8s
- [ ] continiously rewrite the stdout if possible
- [ ] Explain better the choice of timescale in README
- [ ] load test (with screen capture)

### st3
- [ ] integrate graphana on top

## Sample logs

```
127.0.0.1 - james [09/May/2018:16:00:39 +0000] "GET /report HTTP/1.0" 200 123
127.0.0.1 - jill [09/May/2018:16:00:41 +0000] "GET /api/user HTTP/1.0" 200 234
127.0.0.1 - frank [09/May/2018:16:00:42 +0000] "POST /api/user HTTP/1.0" 200 34
127.0.0.1 - mary [09/May/2018:16:00:42 +0000] "POST /api/user HTTP/1.0" 503 12
```
