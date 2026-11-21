/* eslint-disable */
const fs = require('fs');
const net = require('net');

const text = fs.readFileSync('E:/Mock Exam/mock-exam-platform/.env', 'utf8');
const line = text.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
let url = line.trim().slice('DATABASE_URL='.length).trim();
if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
const parsed = new URL(url);

const socket = net.createConnection({ host: parsed.hostname, port: Number(parsed.port) });
socket.setTimeout(30000);
socket.on('connect', () => { console.log('TCP connected'); socket.destroy(); });
socket.on('timeout', () => { console.log('TCP timeout'); socket.destroy(); });
socket.on('error', (error) => { console.log('TCP error:', error.message); });
