import si from 'systeminformation';
import { Rcon } from "rcon-client";
import { exec } from 'child_process';
import fs from 'fs';
import archiver from 'archiver';
import path from 'path';
import moment from 'moment';
import fsExtra from 'fs-extra'; // 引入 fs-extra


/**设置区域**************/

//游戏存档目录
const gamedataPath: string = 'C:\\Users\\kiros\\Desktop\\steamcmd\\steamapps\\common\\PalServer\\Pal\\Saved\\SaveGames';
const backupPath: string = path.join(__dirname, 'backup');
const backupInterval: number = 1800;
const processName: string = "Pal";
const cmd: string = `"C:\\Users\\kiros\\Desktop\\steamcmd\\steamapps\\common\\PalServer\\PalServer.exe"`;
const memTarget: number = 90;
const checkSecond: number = 20;
const rebootSecond: number = checkSecond / 2;
const serverHost: string = '127.0.0.1';
const serverPort: number = 25575;
const rconPassword: string = '19920430vin';

/************************/


const rcon = new Rcon({
    host: serverHost,
    port: serverPort,
    password: rconPassword
});


async function sendMsgandReboot(): Promise<void> {
    try {
        await rcon.connect();
        console.log(`[${moment().format('HH:mm:ss')}] Connected to the server!`);
        await rcon.send(`Shutdown ${rebootSecond} The_server_will_restart_in_${rebootSecond}_seconds.`);
        console.log(`[${moment().format('HH:mm:ss')}] Command sent, not waiting for response`);
    } catch (error) {
        console.error(`[${moment().format('HH:mm:ss')}] Error sending RCON command:`, error);
    } finally {
        rcon.end();
    }
}

function check(): void {
    checkMemoryUsage();
    exec(`tasklist`, (err: Error | null, stdout: string, stderr: string) => {
        if (err) {
            console.error(`[${moment().format('HH:mm:ss')}] Error executing tasklist: ${err}`);
            return;
        }

        if (stdout.toLowerCase().indexOf(processName.toLowerCase()) === -1) {
            console.log(`[${moment().format('HH:mm:ss')}] ${processName} is not running. Attempting to start.`);
            startProcess();
        } else {
            console.log(`[${moment().format('HH:mm:ss')}] ${processName} is already running.`);
        }
    });
}



function startProcess(): void {
    exec(cmd, (err:Error | null, stdout: string, stderr: string) => {
        if (err) {
            console.error(`[${moment().format('HH:mm:ss')}] Error starting process: ${err}`);
            return;
        }
        if (stderr) {
            console.error(`[${moment().format('HH:mm:ss')}] Standard error output: ${stderr}`);
        }
        console.log(`[${moment().format('HH:mm:ss')}] Process started: ${stdout}`);
    });
}

async function checkMemoryUsage(): Promise<number> {
    try {
        const mem: si.Systeminformation.MemData = await si.mem();
        const memPercentage: number = Math.floor((mem.used / mem.total) * 100);
        // console.log(`总内存: ${mem.total}`);
        // console.log(`已用内存: ${mem.used}`);
        // console.log(`空闲内存: ${mem.free}`);
        console.log(`[${moment().format('HH:mm:ss')}] 当前内存占用百分比: ${memPercentage}%`);
        
        if (memPercentage > memTarget) {
            console.log(`负载过高，即将重启。`);
            await sendMsgandReboot();
        }

        return memPercentage;
    } catch (error) {
        console.error(`[${moment().format('HH:mm:ss')}] 获取内存信息时出错:`, error);
        return 0;
    }
}


async function backupDirectory(sourceDir: string, backupDir: string): Promise<void> {
    try {
        // 创建临时目录路径
        const tempDir: string = path.join(backupDir, 'temp');

        // 确保临时目录存在或创建它
        await fsExtra.ensureDir(tempDir);

        // 清空临时目录
        await fsExtra.emptyDir(tempDir);

        // 复制文件到临时目录
        await fsExtra.copy(sourceDir, tempDir);

        // 创建压缩文件的名称
        const zipFileName: string = `backup-${moment().format('YYYYMMDDHHmm')}.zip`;
        const output = fs.createWriteStream(path.join(backupDir, zipFileName));
        const archive = archiver('zip', {
            zlib: { level: 9 } // 设置压缩级别
        });

        output.on('close', function () {
            console.log(`[${moment().format('HH:mm:ss')}] Backup of '${sourceDir}' has been saved as '${zipFileName}'`);
        });

        archive.on('error', function (err) {
            throw err;
        });

        archive.pipe(output);
        archive.directory(tempDir, false);
        archive.finalize();
    } catch (error) {
        console.error(`[${moment().format('HH:mm:ss')}] Error during backup: `, error);
    }
}
 backupDirectory(gamedataPath, backupPath);

// 每隔20秒钟检查一次
setInterval(check, checkSecond*1000);


// 备份游戏目录

setInterval(() => {
    backupDirectory(gamedataPath, backupPath);
}, backupInterval*1000);
