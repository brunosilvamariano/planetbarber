const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/lib/calendar.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{}};new Function('exports','module',source)(context.exports,context);
const {shiftDate,monthBounds,appointmentDate}=context.exports;
test('calendar handles leap years and year boundaries',()=>{assert.equal(shiftDate('2028-02-28',1),'2028-02-29');assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.deepEqual(monthBounds('2026-12'),{from:'2026-12-01',to:'2027-01-01'});});
test('appointments use Sao Paulo day at UTC midnight',()=>{assert.equal(appointmentDate('2026-10-14T02:59:00Z'),'2026-10-13');assert.equal(appointmentDate('2026-10-14T03:00:00Z'),'2026-10-14');});
