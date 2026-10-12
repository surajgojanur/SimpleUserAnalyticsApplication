"""Live API smoke check using curl; run after seed and starting API."""
import json, subprocess, uuid, datetime

def call(path, expected=200, payload=None, origin=None):
    args = ['curl', '-sS', '-w', '\n%{http_code}', 'http://localhost:5000' + path]
    if payload is not None:
        args += ['-H', 'Content-Type: text/plain', '-d', json.dumps(payload)]
    if origin: args += ['-H', 'Origin: ' + origin]
    raw = subprocess.check_output(args, text=True)
    body, status = raw.rsplit('\n', 1)
    assert int(status) == expected, (path, status, body)
    print(f'{expected} {path}')
    return json.loads(body)

event = dict(site_id='demo_store', event_id=str(uuid.uuid4()), session_id='curl-'+str(uuid.uuid4()),
    event_type='page_view', page_url='http://localhost:5174/?private=value#section',
    timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'))
assert call('/api/health')['status'] == 'ok'
assert call('/api/events', 202, event, 'http://localhost:5174')['ok']
assert call('/api/events', 200, event)['duplicate']
call('/api/events', 400, {})
call('/api/events', 404, {**event, 'site_id':'unknown'})
call('/api/events', 403, event, 'https://forbidden.example')
sessions = call('/api/sites/demo_store/sessions?page=1&limit=5')
assert len(sessions['sessions']) == 5 and sessions['total'] >= 31
session = call('/api/sites/demo_store/sessions/'+event['session_id']+'/events')
assert len(session['events']) == 1 and session['events'][0]['page_url'] == 'http://localhost:5174/'
assert len(call('/api/sites')['sites']) >= 1
assert len(call('/api/sites/demo_store/pages')['pages']) == 3
heat = call('/api/sites/demo_store/heatmap?url=http%3A%2F%2Flocalhost%3A5174%2F')
assert heat['total_clicks'] > 0 and len(heat['clicks']) > 0
print('PASS: all live curl assertions')
