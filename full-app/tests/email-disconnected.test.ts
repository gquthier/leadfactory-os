import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {sendEmail} from '../src/lib/email';

test('mail is disconnected in local mode and requires explicit external activation',async()=>{
 const names=['LEADFACTORY_DATA_MODE','LEADFACTORY_ENABLE_EXTERNAL','BREVO_API_KEY','RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS'];
 const prior=Object.fromEntries(names.map(key=>[key,process.env[key]]));
 const fetchBefore=globalThis.fetch,transportBefore=nodemailer.createTransport;
 let requests=0,transports=0;
 try {
  Object.assign(process.env,{BREVO_API_KEY:'FAKE_TEST_TOKEN',RESEND_API_KEY:'FAKE_TEST_TOKEN',SMTP_HOST:'mail.example.invalid',SMTP_USER:'fixture',SMTP_PASS:'fixture'});
  globalThis.fetch=(async()=>{requests++;return new Response('{}',{status:201});}) as typeof fetch;
  nodemailer.createTransport=(()=>{transports++;throw new Error('SMTP must stay disconnected');}) as typeof nodemailer.createTransport;
  const message={to:'fixture@example.invalid',subject:'Fixture',html:'Fixture'};
  process.env.LEADFACTORY_DATA_MODE='local';process.env.LEADFACTORY_ENABLE_EXTERNAL='1';
  await sendEmail(message);assert.equal(requests,0);assert.equal(transports,0);
  process.env.LEADFACTORY_DATA_MODE='supabase';process.env.LEADFACTORY_ENABLE_EXTERNAL='0';
  await sendEmail(message);assert.equal(requests,0);assert.equal(transports,0);
  process.env.LEADFACTORY_ENABLE_EXTERNAL='1';await sendEmail(message);
  assert.equal(requests,1);assert.equal(transports,0);
 }finally{
  globalThis.fetch=fetchBefore;nodemailer.createTransport=transportBefore;
  for(const key of names){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
 }
});
