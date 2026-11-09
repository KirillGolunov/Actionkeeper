import { createRefreshLoader } from './refreshLoader';
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const failure = (status=400,data='400 Bad Request') => ({response:{status,data}});
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
test('background text 400 retries once and retains data without error',async()=>{
 const request=jest.fn().mockResolvedValueOnce('old').mockRejectedValueOnce(failure()).mockResolvedValueOnce('new');const onSuccess=jest.fn(),onError=jest.fn();const l=createRefreshLoader({request,onSuccess,onError});await l.start();jest.advanceTimersByTime(30000);await flush();expect(onError).not.toHaveBeenCalled();expect(onSuccess).toHaveBeenLastCalledWith('old');jest.advanceTimersByTime(2000);await flush();expect(onSuccess).toHaveBeenLastCalledWith('new');l.stop();
});
test('two failures show error after retry, initial load also retries',async()=>{
 const request=jest.fn().mockRejectedValue(failure());const onError=jest.fn();const l=createRefreshLoader({request,onSuccess:jest.fn(),onError});await l.start();expect(onError).not.toHaveBeenCalled();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(2);expect(onError).toHaveBeenCalledTimes(1);l.stop();
});
test.each([failure(400,{errorCode:'invalid_period'}),failure(401),failure(403)])('does not retry auth or structured validation errors',async error=>{
 const request=jest.fn().mockRejectedValue(error),onError=jest.fn();const l=createRefreshLoader({request,onSuccess:jest.fn(),onError});await l.start();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(1);expect(onError).toHaveBeenCalledTimes(1);l.stop();
});
test('slow request cannot overlap manual refresh or timer; stopped old request cannot publish',async()=>{
 let resolve;const request=jest.fn(signal=>new Promise(r=>{resolve=r;})),onSuccess=jest.fn(),onError=jest.fn();const l=createRefreshLoader({request,onSuccess,onError});const first=l.start();l.retry();jest.advanceTimersByTime(90000);expect(request).toHaveBeenCalledTimes(1);const signal=request.mock.calls[0][0];l.stop();expect(signal.aborted).toBe(true);resolve('stale');await first;expect(onSuccess).not.toHaveBeenCalled();expect(onError).not.toHaveBeenCalled();jest.advanceTimersByTime(90000);expect(request).toHaveBeenCalledTimes(1);
});
test('manual retry replaces pending retry and success clears error through callback',async()=>{
 const request=jest.fn().mockRejectedValueOnce(failure()).mockResolvedValue('ok'),onSuccess=jest.fn();const l=createRefreshLoader({request,onSuccess,onError:jest.fn()});await l.start();await l.retry();jest.advanceTimersByTime(2000);await flush();expect(request).toHaveBeenCalledTimes(2);expect(onSuccess).toHaveBeenCalledWith('ok');l.stop();
});
