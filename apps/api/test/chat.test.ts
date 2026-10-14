import 'reflect-metadata';
import {test} from 'node:test';import assert from 'node:assert/strict';import {ChatController} from '../src/http/chat.controller';
const id='00000000-0000-4000-8000-000000000002';
test('chat scopes access by tenant and barber/client and refuses foreign appointments',async()=>{
 for(const role of ['BARBEIRO','CLIENTE']){
 let called=false;const req:any={actor:{tenantId:id,id,role,barberId:id,clientId:id}};
 const tx:any={appointment:{findFirst:async(args:any)=>{assert.equal(args.where.tenantId,id);assert.equal(args.where[role==='BARBEIRO'?'barberId':'clientId'],id);return null;}},$queryRawUnsafe:async()=>{called=true;}};
 const controller=new ChatController({transaction:async(_:any,fn:any)=>fn(tx)} as any);
 await assert.rejects(controller.messages(req,id));assert.equal(called,false);
 }
});
test('chat rejects empty and excessive messages before writing',async()=>{const controller=new ChatController({} as any);for(const body of ['', 'x'.repeat(2001)]) await assert.rejects(async()=>controller.send({} as any,id,{body}));});
