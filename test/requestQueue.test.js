const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequestQueue } = require('../requestQueue');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const tick = () => new Promise(r => setImmediate(r));
const req = { method: 'GET', path: '/test' };
test('closed waiting request is skipped and following requests proceed', async () => {
  const records=[]; const queue=createRequestQueue({log:r=>records.push(r)}); const gate=deferred();
  let skippedRan=false, followingRan=false;
  const first=queue(async()=>gate.promise)(req,{},assert.fail);
  const closed={}; const second=queue(async()=>{skippedRan=true})(req,closed,assert.fail);
  const third=queue(async()=>{followingRan=true})(req,{},assert.fail);
  await tick(); closed.destroyed=true; gate.resolve(); await Promise.all([first,second,third]);
  assert.equal(skippedRan,false);assert.equal(followingRan,true);assert.equal(records[1].outcome,'skipped_closed');
});
test('disconnect and early response do not release running database work',async()=>{
  const queue=createRequestQueue({log:()=>{}}); const gate=deferred();const response={};let following=false;
  const first=queue(async()=>{response.writableEnded=true;await gate.promise})(req,response,assert.fail);
  const second=queue(async()=>{following=true})(req,{},assert.fail);
  await tick();response.destroyed=true;await tick();assert.equal(following,false);gate.resolve();await Promise.all([first,second]);assert.equal(following,true);
});
test('handler and preflight errors release queue and reach next once',async()=>{
  for(const preflight of [false,true]){let failures=0,ran=false;const queue=createRequestQueue({before:async r=>{if(preflight&&r.fail)throw Error('expected');return true},log:()=>{}});
  await queue(async()=>{throw Error('expected')})({...req,fail:true},{},e=>{assert.equal(e.message,'expected');failures++});
  await queue(async()=>{ran=true})(req,{},assert.fail);assert.equal(failures,1);assert.equal(ran,true);}
});
test('preflight early response skips handler and releases queue',async()=>{
  let ran=false;const queue=createRequestQueue({before:async r=>!r.stop,log:()=>{}});
  await queue(async()=>assert.fail('must skip'))({...req,stop:true},{},assert.fail);
  await queue(async()=>{ran=true})(req,{},assert.fail);assert.equal(ran,true);
});
