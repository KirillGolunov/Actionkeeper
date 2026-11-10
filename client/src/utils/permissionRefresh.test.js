import { createPermissionRefresh } from './permissionRefresh';
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
test('permission refresh keeps days but disables editing through transient failure, then restores confirmed rights',async()=>{
 const request=jest.fn().mockResolvedValueOnce({data:{days:{'2026-11-10':{canEdit:true}}}}).mockRejectedValueOnce({response:{status:400,data:'400 Bad Request'}}).mockResolvedValueOnce({data:{days:{'2026-11-10':{canEdit:false}}}});
 const onPermissions=jest.fn();const loader=createPermissionRefresh({request,onPermissions,environment:null,jitterMs:0});expect(onPermissions).toHaveBeenLastCalledWith({denied:true});await loader.start();expect(onPermissions.mock.calls.at(-1)[0].denied).toBe(false);
 jest.advanceTimersByTime(30000);await flush();expect(onPermissions).toHaveBeenLastCalledWith({'2026-11-10':{canEdit:true},denied:true});jest.advanceTimersByTime(2000);await flush();expect(onPermissions).toHaveBeenLastCalledWith({'2026-11-10':{canEdit:false},denied:false});loader.stop();
});
test('malformed success never enables editing and stopped old scope cannot publish',async()=>{
 const onPermissions=jest.fn();let resolve;const loader=createPermissionRefresh({request:()=>new Promise(r=>{resolve=r}),onPermissions,environment:null});const pending=loader.start();await flush();loader.stop();resolve({data:{days:{x:{canEdit:true}}}});await pending;expect(onPermissions).toHaveBeenCalledTimes(1);
 const bad=createPermissionRefresh({request:async()=>({data:{}}),onPermissions,environment:null});await bad.start();expect(onPermissions).toHaveBeenLastCalledWith({denied:true});bad.stop();
});
test('403 remains unavailable without transient retry',async()=>{
 const request=jest.fn().mockRejectedValue({response:{status:403,data:{errorCode:'forbidden'}}}),onPermissions=jest.fn();const l=createPermissionRefresh({request,onPermissions,environment:null});await l.start();jest.advanceTimersByTime(2500);await flush();expect(request).toHaveBeenCalledTimes(1);expect(onPermissions).toHaveBeenLastCalledWith({denied:true});l.stop();
});

test.each([{}, {x:{canEdit:'true'}}, {x:null}])('invalid permission maps remain unavailable',async days=>{
 const onPermissions=jest.fn();const l=createPermissionRefresh({request:async()=>({data:{days}}),onPermissions,environment:null});await l.start();expect(onPermissions).toHaveBeenLastCalledWith({denied:true});l.stop();
});
