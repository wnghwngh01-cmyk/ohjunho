import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('js/app.js','utf8');
const db=fs.readFileSync('js/db.js','utf8');

// Server write is owner-scoped and exported.
assert.match(db,/async function setRecordFavorite\(id,on\)\{const \{data,error\}=await client\.from\('records'\)\.update\(\{favorite:!!on\}\)\.eq\('id',id\)\.eq\('user_id',uid\(\)\)/);
assert.match(db,/listRecords,createRecord,updateRecord,setRecordFavorite/);
assert.match(app,/state\.records=records;state\.ownPublications=[^;]*;await migrateLocalFavorites\(\);/,'records page migrates device favorites once');

const block=app.match(/  function favoriteKey\(\)[\s\S]*?(?=\n  function renderRecords\(\))/)?.[0];
assert.ok(block,'favorite helpers found');

function setup({records,local,failIds=[]}){
  const store=new Map(local===undefined?[]:[['lab:favorites:u1',JSON.stringify(local)]]);
  const calls=[];let renders=0;
  const ctx={
    state:{records:records.map(r=>({...r}))},
    DB:{user:()=>({id:'u1'}),setRecordFavorite:async(id,on)=>{calls.push([id,on]);if(failIds.includes(id))throw new Error('network');return{id,favorite:on}}},
    localStorage:{getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)},
    withError:async fn=>fn(),renderRecords:()=>{renders++},console:{warn(){}}
  };
  vm.runInNewContext(`${block};this.api={favoriteIds,migrateLocalFavorites,toggleFavorite};`,ctx);
  return{ctx,store,calls,renders:()=>renders};
}

// Favorites come from the record column, not the device.
{const {ctx}=setup({records:[{id:'a',favorite:true},{id:'b',favorite:false}],local:['b']});
 assert.deepEqual([...ctx.api.favoriteIds()],['a']);}

// One-time migration of old device favorites, including ids outside the loaded list; local key removed afterwards.
{const {ctx,store,calls}=setup({records:[{id:'a',favorite:false},{id:'b',favorite:true}],local:['a','b','old-beyond-300']});
 await ctx.api.migrateLocalFavorites();
 assert.deepEqual(calls,[['a',true],['old-beyond-300',true]],'already-favorite rows are skipped');
 assert.equal(ctx.state.records[0].favorite,true);
 assert.equal(store.has('lab:favorites:u1'),false,'device key is removed after a successful move');
 calls.length=0;await ctx.api.migrateLocalFavorites();assert.equal(calls.length,0,'migration runs only once');}

// A failed move keeps the device list so it can retry next time.
{const {ctx,store}=setup({records:[{id:'a',favorite:false}],local:['a'],failIds:['a']});
 await ctx.api.migrateLocalFavorites();
 assert.equal(store.has('lab:favorites:u1'),true);
 assert.equal(ctx.state.records[0].favorite,false);}

// Toggle is optimistic, persisted, reverted on failure and ignores a double tap in flight.
{const {ctx,calls}=setup({records:[{id:'a',favorite:false}]});
 const first=ctx.api.toggleFavorite('a');const second=ctx.api.toggleFavorite('a');await Promise.all([first,second]);
 assert.deepEqual(calls,[['a',true]],'double tap while saving sends one request');
 assert.equal(ctx.state.records[0].favorite,true);}
{const {ctx}=setup({records:[{id:'a',favorite:false}],failIds:['a']});
 await ctx.api.toggleFavorite('a');
 assert.equal(ctx.state.records[0].favorite,false,'failed save restores the previous state');}

console.log('record favorites behavior: PASS (server column, one-time device migration, optimistic toggle)');
