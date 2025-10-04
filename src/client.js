

const WebSocket = require('ws');
const os = require('os');
const { spawn,execFile} = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require("http");
const chalk = require('chalk');
const dns = require("dns");
const fs_mv = require("mv");
const username = require("username");
const host_name = os.hostname();
const ws_api_port_of_service = "3001";
var ws_ceps_api = null;

function make_timestamp(){
    function two_digits(n){
        if (n < 10) return "0"+n.toString();
        else return n.toString();
    }

    let t = new Date(Date.now());
    let timestamp = `${t.getFullYear()}-${two_digits(t.getMonth()+1)}-${two_digits(t.getDate())} ${two_digits(t.getHours())}:${two_digits(t.getMinutes())}:${two_digits(t.getSeconds())}`;
    return timestamp;
}

function log(who,msg){
    console.log(chalk.white(`${make_timestamp()} [${who}] ${msg}`));
}
 
function log_err(who,msg){
    console.log(chalk.red(`${make_timestamp()} [${who}] ${msg}`));
}

function backend_connected(){
    return ws_ceps_api != null
}

function main(){
    let text_decoder = new TextDecoder();
    let ws_ceps_api = new WebSocket(`ws://localhost:${ws_api_port_of_service}`);
    ws_ceps_api.on("error", (err) => {
        ws_ceps_api = null;
        log_err("main()",`Connect to ws://localhost:${ws_api_port_of_service} failed.`);
    });
    ws_ceps_api.on("open", () => {
        log("maim()",`Successfully connected to ws://localhost:${ws_api_port_of_service}.`);
        var account = { Account: {a:10, b:2}};
        var account_serialized = JSON.stringify(account);
        console.log(account_serialized);
        ws_ceps_api.send("EVENT\nevAddAccount\n"+account_serialized+"\n");
        account = { Account: {a:11, b:3}};
        account_serialized = JSON.stringify(account);
        ws_ceps_api.send("EVENT\nevAddAccount\n"+account_serialized+"\n");
        account = { Account: {a:12, b:4}};
        account_serialized = JSON.stringify(account);
        ws_ceps_api.send("EVENT\nevAddAccount\n"+account_serialized+"\n");
        account = { Account: {a:13, b:5}};
        account_serialized = JSON.stringify(account);
        ws_ceps_api.send("EVENT\nevAddAccount\n"+account_serialized+"\n");

        //ws_ceps_api.send("EVENT\nevAddAccount");
    });
    ws_ceps_api.on("close", () => {
        ws_ceps_api = null;
        log("maim()",`Connection to ws://localhost:${ws_api_port_of_service} closed.`);
    });
    ws_ceps_api.on("message", function (msg) {
        log("main()",`${msg}`);
        let smsg = text_decoder.decode(msg);
        let decoded_msg = JSON.parse(smsg);
        console.log(decoded_msg);         
    } );  
}

main();

/*ws_ceps_api.on("open", () => {
    ws_ceps_api.on("message", function (msg){
        log_debug(`fetch_planned_rollouts()/fetch_proc()`,`Received a reply from localhost:${current_ws_api_port} pid=${cproc.pid}`);
        let m = JSON.parse(msg).sresult;
        let removed_rollouts = [];
        new_rollouts = extract_rollout_data_from_webservice_result(m);
        let changed = merge_rollouts(new_rollouts,removed_rollouts);
        if (changed){
            log_debug(`fetch_planned_rollouts()/db update`,`Changes in DB detected`);
            for(let i = 0; i != rollouts.length;++i){
            let rollout = rollouts[i];
             if (rollout.changed != undefined && rollout.changed){
                log_debug(`fetch_planned_rollouts()/db update`,`Rollout id=${rollout.id} changed, trigger broadcast. pid=${cproc.pid}`);
              broadcast(JSON.stringify({reply:"ok",rollout:rollout}));
             }
         }
         for(let i = 0; i != removed_rollouts.length;++i){
            let rollout = removed_rollouts[i];
            let r = {id:rollout.id};
            log_debug("","Removing Rollout with id = "+r.id);
            broadcast(JSON.stringify({reply:"ok",rollout:r}));
         }
        } else log_debug("merge_rollouts: no changes detected");
        try{if (back_channel != undefined) back_channel.send(JSON.stringify(rollouts));}catch(err){}
        log_debug(`fetch_planned_rollouts()/fetch_proc()`,`Shutting down of process with pid=${cproc.pid}`);
        let kill_proc = ()=> {
            try{process.kill(cproc.pid);}catch(err){
                log_err("fetch_planned_rollouts()/fetch_proc():kill_proc",`Failed to kill process with pid=${cproc.pid}. Retry in 1 second.`);
                setTimeout(kill_proc,2000);
            }
        };
        kill_proc();
        if (callback != undefined) callback(undefined);
    });
    ws_ceps_api.send("QUERY root.rollout_;");         
} );
ws_ceps_api.on("close", () => {} );
*/