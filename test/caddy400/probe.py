import http.client, socket, time, json, subprocess
results=[]
for idle in [0, 1, 5, 30]:
    c=http.client.HTTPConnection('127.0.0.1',18080,timeout=10)
    for i in range(4):
        c.request('GET','/api/user-selection?purpose=timesheet&startDate=2026-11-09&endDate=2026-11-15',headers={'If-None-Match':'"lab-etag"','Connection':'keep-alive'})
        r=c.getresponse();r.read();results.append({'case':'valid_keepalive_etag','idle':idle,'iteration':i,'status':r.status,'handler':r.getheader('X-Lab-Handler')})
        assert r.status==304
        if i<3:time.sleep(idle)
    c.close()
for name,raw in [('nul_header',b'GET /api/user-selection HTTP/1.1\r\nHost: localhost\r\nX-Test: a\x00b\r\n\r\n'),('bad_request_line',b'GET /api/user-selection HTTP/1.X\r\nHost: localhost\r\n\r\n')]:
    with socket.create_connection(('127.0.0.1',18080),timeout=5) as s:
        s.sendall(raw);data=b''
        while True:
            chunk=s.recv(4096)
            if not chunk:break
            data+=chunk
    results.append({'case':name,'response':data.decode('ascii',errors='replace')})
    assert b'400 Bad Request' in data
print(json.dumps(results,indent=2))
