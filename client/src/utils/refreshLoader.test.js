import { createRefreshLoader } from './refreshLoader';
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const failure = (status=400,data='400 Bad Request') => ({response:{status,data}});
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
test('background text 400 retries once and retains data without error',async()=>{
 const request=jest.fn().mockResolvedValueOnce('old').mockRejectedValueOnce(failure()).mockResolvedValueOnce('new');const onSuccess=jest.fn(),onError=jest.fn();const l=createRefreshLoader({jitterMs:0,environment:null,request,onSuccess,onError});await l.start();jest.advanceTimersByTime(30000);await flush();expect(onError).not.toHaveBeenCalled();expect(onSuccess).toHaveBeenLastCalledWith('old');jest.advanceTimersByTime(2000);await flush();expect(onSuccess).toHaveBeenLastCalledWith('new');l.stop();
});
test('two failures show error after retry, initial load also retries',async()=>{
 const request=jest.fn().mockRejectedValue(failure());const onError=jest.fn();const l=createRefreshLoader({jitterMs:0,environment:null,request,onSuccess:jest.fn(),onError});await l.start();expect(onError).not.toHaveBeenCalled();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(2);expect(onError).toHaveBeenCalledTimes(1);l.stop();
});
test.each([failure(400,{errorCode:'invalid_period'}),failure(401),failure(403)])('does not retry auth or structured validation errors',async error=>{
 const request=jest.fn().mockRejectedValue(error),onError=jest.fn();const l=createRefreshLoader({jitterMs:0,environment:null,request,onSuccess:jest.fn(),onError});await l.start();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(1);expect(onError).toHaveBeenCalledTimes(1);l.stop();
});
test('slow request cannot overlap manual refresh or timer; stopped old request cannot publish',async()=>{
 let resolve;const request=jest.fn(signal=>new Promise(r=>{resolve=r;})),onSuccess=jest.fn(),onError=jest.fn();const l=createRefreshLoader({jitterMs:0,environment:null,request,onSuccess,onError});const first=l.start();l.retry();await flush();jest.advanceTimersByTime(90000);expect(request).toHaveBeenCalledTimes(1);const signal=request.mock.calls[0][0];l.stop();expect(signal.aborted).toBe(true);resolve('stale');await first;expect(onSuccess).not.toHaveBeenCalled();expect(onError).not.toHaveBeenCalled();jest.advanceTimersByTime(90000);expect(request).toHaveBeenCalledTimes(1);
});
test('manual retry replaces pending retry and success clears error through callback',async()=>{
 const request=jest.fn().mockRejectedValueOnce(failure()).mockResolvedValue('ok'),onSuccess=jest.fn();const l=createRefreshLoader({jitterMs:0,environment:null,request,onSuccess,onError:jest.fn()});await l.start();await l.retry();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(2);expect(onSuccess).toHaveBeenCalledWith('ok');l.stop();
});

function fakeEnvironment() {
 const listeners = new Map();
 const env = { navigator:{onLine:true}, document:{visibilityState:'visible'} };
 env.addEventListener=(name,fn)=>{ if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn); };
 env.removeEventListener=(name,fn)=>listeners.get(name)?.delete(fn);
 env.document.addEventListener=env.addEventListener;env.document.removeEventListener=env.removeEventListener;
 env.emit=name=>listeners.get(name)?.forEach(fn=>fn());
 env.count=()=>[...listeners.values()].reduce((n,s)=>n+s.size,0);
 return env;
}
test('hidden/offline suspend polling, resume refreshes once, cleanup removes listeners',async()=>{
 const environment=fakeEnvironment(),request=jest.fn().mockResolvedValue('ok'),onUnavailable=jest.fn();
 const l=createRefreshLoader({environment,jitterMs:0,request,onSuccess:jest.fn(),onError:jest.fn(),onUnavailable});
 await l.start();environment.document.visibilityState='hidden';environment.emit('visibilitychange');jest.advanceTimersByTime(90000);await flush();expect(request).toHaveBeenCalledTimes(1);
 environment.document.visibilityState='visible';environment.emit('visibilitychange');environment.emit('focus');await flush();expect(request).toHaveBeenCalledTimes(2);
 environment.navigator.onLine=false;environment.emit('offline');jest.advanceTimersByTime(90000);await flush();expect(request).toHaveBeenCalledTimes(2);
 environment.navigator.onLine=true;environment.emit('online');await flush();expect(request).toHaveBeenCalledTimes(3);expect(onUnavailable).toHaveBeenCalled();l.stop();expect(environment.count()).toBe(0);
});
test('deadline aborts hanging GET and retries once',async()=>{
 const signals=[];const request=jest.fn(signal=>{signals.push(signal);return new Promise(()=>{});});const onError=jest.fn();
 const l=createRefreshLoader({environment:null,jitterMs:0,timeoutMs:100,request,onSuccess:jest.fn(),onError});l.start();await flush();jest.advanceTimersByTime(100);await flush();expect(signals[0].aborted).toBe(true);jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(2);jest.advanceTimersByTime(100);await flush();expect(onError).toHaveBeenCalledTimes(1);l.stop();
});
test('offline invalidates in-flight success so permissions cannot be re-enabled',async()=>{
 const environment=fakeEnvironment();let resolve;const onSuccess=jest.fn(),onUnavailable=jest.fn();
 const l=createRefreshLoader({environment,request:()=>new Promise(r=>{resolve=r}),onSuccess,onError:jest.fn(),onUnavailable});const pending=l.start();await flush();environment.navigator.onLine=false;environment.emit('offline');resolve({canEdit:true});await pending;expect(onSuccess).not.toHaveBeenCalled();expect(onUnavailable).toHaveBeenCalled();l.stop();
});
test('JSON server failures are transient but validation failures are not',async()=>{
 const request=jest.fn().mockRejectedValueOnce(failure(503,{error:'unavailable'})).mockResolvedValue('ok'),onSuccess=jest.fn();const l=createRefreshLoader({environment:null,jitterMs:0,request,onSuccess,onError:jest.fn()});await l.start();jest.advanceTimersByTime(2000);await flush();expect(onSuccess).toHaveBeenCalledWith('ok');l.stop();
});
