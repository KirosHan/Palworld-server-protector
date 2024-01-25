import si from 'systeminformation';
import { Rcon } from "rcon-client";
import { exec } from 'child_process';
import fs from 'fs';
import archiver from 'archiver';
import path from 'path';
import moment from 'moment';
import fsExtra from 'fs-extra'; // 引入 fs-extra
import ps from 'ps-node';

/**设置区域**************/

//游戏存档目录
const gamedataPath: string = String.raw`C:\Users\kiros\Desktop\steamcmd\steamapps\common\PalServer\Pal\Saved\SaveGames`;

//存档备份路径
const backupPath: string = path.join(__dirname, 'backup');

//存档备份周期
const backupInterval: number = 1800;

//监控服务端名称
//const processName: string = "Pal";

//服务端启动路径
const cmd: string = String.raw`C:\Users\kiros\Desktop\steamcmd\steamapps\common\PalServer\PalServer.exe`;

//内存占用百分比阈值（%）
const memTarget: number = 90;

//内存监控周期（秒）
const checkSecond: number = 40;

//关服延迟（秒） 默认内存监控周期一半（不应超过内存监控周期，避免重复触发指令）
const rebootSecond: number = checkSecond / 2;

//rcon地址 默认本季
const serverHost: string = '127.0.0.1';

//rcon端口
const serverPort: number = 25575;

//rcon密码
const rconPassword: string = 'admin';

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

// function check(): void {
//     checkMemoryUsage();
//     exec(`tasklist`, (err: Error | null, stdout: string, stderr: string) => {
//         if (err) {
//             console.error(`[${moment().format('HH:mm:ss')}] Error executing tasklist: ${err}`);
//             return;
//         }

//         if (stdout.toLowerCase().indexOf(processName.toLowerCase()) === -1) {
//             console.log(`[${moment().format('HH:mm:ss')}] ${processName} is not running. Attempting to start.`);
//             startProcess();
//         } else {
//             console.log(`[${moment().format('HH:mm:ss')}] ${processName} is already running.`);
//         }
//     });
// }



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
            backupDirectory(gamedataPath, backupPath);//关服前备份一次
            await sendMsgandReboot();
        }

        return memPercentage;
    } catch (error) {
        console.error(`[${moment().format('HH:mm:ss')}] 获取内存信息时出错:`, error);
        return 0;
    }
}

async function checkServerStatus(): Promise<void> {
    try {
      // 检查内存使用情况
      checkMemoryUsage();
  
  
      // 查找特定路径的进程
      ps.lookup({}, (err, resultList) => {
        if (err) {
          throw err;
        }
  
        let isFound = false;
        for (const process of resultList) {
          if (process && process.command === cmd) {
            isFound = true;
            console.log(`[${moment().format('HH:mm:ss')}] 发现服务端正在安稳运行。`);
  
            break;
          }
        }
  
        if (!isFound) {
        console.log(`[${moment().format('HH:mm:ss')}] 未发现服务端，尝试启动。`);
          startProcess();
        }
      });
  
    } catch (error) {
      console.error(`错误: ${error}`);
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
setInterval(checkServerStatus, checkSecond*1000);


// 备份游戏目录

setInterval(() => {
    backupDirectory(gamedataPath, backupPath);
}, backupInterval*1000);
