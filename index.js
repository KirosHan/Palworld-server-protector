const si = require('systeminformation');
const { Rcon } = require("rcon-client");
const { exec } = require('child_process');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const moment = require('moment');

/**设置区域**************/

//游戏存档目录
const gamedataPath = 'C:\\Users\\kiros\\Desktop\\steamcmd\\steamapps\\common\\PalServer\\Pal\\Saved\\SaveGames'

//备份目录  默认为根目录下backup文件夹
const backupPath = path.join(__dirname, 'backup');

//存档备份周期（秒）  3600为1小时
const backupInterval = 1800; 

// 进程名称，可以先运行一次服务器看看任务管理器中的名字
const processName = "Pal"; 

//完整服务端路径  （双引号是为了应对路径中有空格的情况）
const cmd = `"C:\\Users\\kiros\\Desktop\\steamcmd\\steamapps\\common\\PalServer\\PalServer.exe"`;

//内存占用百分比
const memTarget = 90

//巡检周期（秒）即每次都会检查内存占用
const checkSecond = 20

//重启倒计时（秒）  理论上这个时间应该小于巡检周期  默认取周期一半时间
const rebootSecond = checkSecond/2

//服务器地址本机保持默认
const serverHost = '127.0.0.1'

//服务器rcon端口
const serverPort = 25575

//rcon密码
const rconPassword = 'admin'

/************************/


const rcon = new Rcon({
    host: serverHost,
    port: serverPort,
    password: rconPassword
});


async function sendMsgandReboot() {
    try {
        await rcon.connect();
        console.log("[${moment().format('HH:mm')}] Connected to the server!");
        await rcon.send(`Shutdown ${rebootSecond} The_server_will_restart_in_${rebootSecond}_seconds.`);
        console.log("[${moment().format('HH:mm')}] Command sent, not waiting for response");
    } catch (error) {
        console.error("[${moment().format('HH:mm')}] Error sending RCON command:", error);
    } finally {
        rcon.end(); 
    }
}


function check() {
    checkMemoryUsage()
    exec(`tasklist`, (err, stdout, stderr) => {
        if (stdout.toLowerCase().indexOf(processName.toLowerCase()) === -1) {
            console.log(`[${moment().format('HH:mm')}] ${processName} is not running. Attempting to start.`);
            startProcess();
        } else {
            console.log(`[${moment().format('HH:mm')}] ${processName} is already running.`);
        }
    });
}

function startProcess() {
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error(`[${moment().format('HH:mm')}] Error starting process: ${err}`);
            return;
        }
        if (stderr) {
            console.error(`[${moment().format('HH:mm')}] Standard error output: ${stderr}`);
        }
        console.log(`[${moment().format('HH:mm')}] Process started: ${stdout}`);
    });
}

async function checkMemoryUsage() {
    try {
        const mem = await si.mem();
        const memPercentage = Math.floor(mem.used/mem.total*100)
        // console.log(`总内存: ${mem.total}`);
        // console.log(`已用内存: ${mem.used}`);
        // console.log(`空闲内存: ${mem.free}`);
        console.log(`[${moment().format('HH:mm')}] 当前内存占用百分比: ${memPercentage}%`);    
        if(memPercentage>memTarget){
            console.log(`负载过高，即将重启。`);    
            sendMsgandReboot()
        }   
        // await sendCommand(`Broadcast 内存占用${memPercentage}%}`)
        return memPercentage
    } catch (error) {
        console.error(`[${moment().format('HH:mm')}] 获取内存信息时出错: ${error}`);
        return 0
    }
}

function backupDirectory(sourceDir, backupDir) {
    const zipFileName = `backup-${moment().format('YYYYMMDDHHmm')}.zip`;
    const output = fs.createWriteStream(path.join(backupDir, zipFileName));
    const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
    });

    output.on('close', function() {
        console.log(`[${moment().format('HH:mm')}] Backup of '${sourceDir}' has been saved as '${zipFileName}'`);
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
}
backupDirectory(gamedataPath, backupPath);

// 每隔20秒钟检查一次
setInterval(check, checkSecond*1000);


// 备份游戏目录

setInterval(() => {
    backupDirectory(gamedataPath, backupPath);
}, backupInterval*1000);
