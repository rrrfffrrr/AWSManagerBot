// packages
import { Client } from 'discord.js';
import { GetState } from './ec2 manager';
import { CreateLogger } from './logger';

var logger = CreateLogger("logs");

GetState()?.then(result => {
    console.log(JSON.stringify(result));
}).catch(e => {
    console.log(e);
})

// discord
let client = new Client();

client.on('message', (msg) => {
    console.log(msg.content);
});

client.login(process.env.DISCORD_TOKEN);