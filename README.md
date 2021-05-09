## Puppylog

Exploration project (not for production use). A tiny distributed log collector build on top of timescaledb 2.0. 

## Installation

### 0. Install a desired flavour of timescaledb 2.0

Option #1: Follow the installation guide at https://docs.timescale.com/latest/getting-started/installation

Option #2: Setup distributed timescaledb on kubernetes via helms from https://github.com/timescale/timescaledb-kubernetes/tree/master/charts/timescaledb-multinode

I will strongly recommend going with [microk8s](https://microk8s.io/) flavour of kubernetes as it will be faster to setup a test multinode cluster that way.

### 1. Clone, install dependencies and build

You need to have git, node and npm available at PATH, then

```
# private repo, email me for the access or you already have the tarbar
git clone https://github.com/ambientlight/puppylog
cd puppylog

# or yarn install
npm install
npm run build
```

### 2. IMPORTANT! Make sure postgres enviroment variable are set at path appropeately or you access psql direclty

```
export PGPASSWORD=your_password
export PGHOST=your_host
export PGUSER=your_user
export PGDATABASE=your_database
```

### 3. bootstap the database model

```
# pass --distributed for multinode setup with distributed hypetables (when setuped on kubernetes)
./bootstrap_model.sh
```

## Quickstart

In first terminal window:
```
node ./dist/monotir.js metrics create --default
node ./dist/monitor.js alerts observe
```

In second terminal window run collector in watch mode:
```
node ./dist/collector.js -s test.log --watch
```

In third terminal window, pipe new logs into test, do this enough to trigger the default alarm
```
cat sample.log > test.log
```

## Usage

Consists of two command line utilities: collector to inject log streams into database, and monitor to monitor metrics and alerts. Monitor metrics and alerts are flexible, you can create metrics based on different statistics and property and same way with alerts too.

Collecting log streams:

```
$ node ./dist/collector.js --help

Usage: collector [options]

Puppylog collector

Options:
  -s, --source <source path>  source log path (default: "/tmp/access.log")
  -w, --watch                 continiously monitor file changes (default: false)
  -n, --now                   replace timestamp in all logs to now (default: false)
  -r, --redirect_psql_out     redirect psql stdout to process.stdout (default: false)
  -h, --help                  display help for command


Example:
node ./dist/collector.js -s test.log --watch
```

Monitor:
```
$ node ./dist/monitor.js --help

Puppylog(A tiny distributed log collector) monitor

Options:
  -h, --help      display help for command

Commands:
  metrics
  alerts
  help [command]  display help for command

```

Viewing and creating metrics: 
```
$ node ./dist/monitor.js metrics --help

Usage: monitor metrics [options] [command]

Options:
  -h, --help                 display help for command

Commands:
  get <metrics_identifier>   display latest metric observations
  meta <metrics_identifier>  display metric metadata
  create [options]           create new metrics

Examples:
node ./dist/monotir.js metrics create --default
node ./dist/monitor.js metrics create -id magic -s count --prop \* --period 60 --refresh_rate 60
```

Viewing alerts (no custom creation for alerts just yet escape through code):
```
$ node ./dist/monitor.js alerts

Available alerts:
totaltraffic

To observe all alert statuses run:
monitor alerts observe

To view alert details run:
monitor alerts get <alert name>
monitor alerts meta <alert name>
```

## Architecture

Timescaledb has been selected as database backend for this as it is generally a reasonable datastore purposely-build to store and scale timeseries data in timebased chunks (hypertables). With the release of timescaledb 2.0 we can have an out-of-the box multinode setup making seting a scalable infra way easier.
Also timescaledb adds features missing to postgresql such as build-in job scheduler, which allows to perform the entire aggregation and alerting logic on database level with clients being just injectors or viewers and not handling aggregation of potentially large data themlelves.

The disadvantage is here is that we build this with very specific features of timescaledb(continious aggregates, automated jobs, distributed hypertables) that will be make it difficult to migrate from. Also ACID guarantees makes write probably somehow slower on scale then NoSQL timeseries database offerings.

## Models

Check default metrics and alerts firts at [/src/defaults.ts](/src/defaults.ts), Then
check [/src/Metrics.ts](/src/Metrics.ts), [/src/LogStream.ts](/src/LogStream.ts), [/src/LogRecord.ts](/src/,LogRecord.ts)

LogRecords and Alert signal history are the only things that are persisted in form of tables. Metrics populate a continous aggregates (autoupdating materialized view stored in schards) and Alert exist in form of a period job and stored postgres procedure

## Further improvements
* allow adding custom alerts
* delete functionality for alerts and metrics
* has scalability in mind though I haven't tested kubernetes setup much, this needs better scalability tests
* integrate a popular visualization tool on top like graphana, that should integrate ok with kubernetes setup
* Build out functionality for loggroups since several applications likely will have a set of log files to stream from (loggroups exist in the model but no functionality associate with it)
