SELECT split_part(request_route, '/', 2) as root_route, time_bucket('1h', ts) as hour, COUNT(*) total_logs FROM logrecords 
GROUP BY split_part(request_route, '/', 2), time_bucket('1h', ts) HAVING COUNT(*) > 10 
ORDER BY hour DESC;